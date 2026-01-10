import os
import io
from datetime import timedelta
from typing import List, Dict

import torch
from PIL import Image

# FastAPI
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Google Cloud
from google.cloud import storage
from google.auth import default
from google.auth.transport import requests

# CLIP
from transformers import CLIPProcessor, CLIPModel


# =============================
# FASTAPI APP
# =============================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# GCS SETUP
# =============================
BUCKET_NAME = "campus-finder-bucket"

gcp_credentials, project_id = default()
storage_client = storage.Client(credentials=gcp_credentials)
bucket = storage_client.bucket(BUCKET_NAME)

# =============================
# DEVICE
# =============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =============================
# CLIP (GLOBAL SINGLETON)
# =============================
clip_model: CLIPModel | None = None
clip_processor: CLIPProcessor | None = None

# =============================
# EMBEDDING CACHE
# { item_name: [tensor(1,512), ...] }
# =============================
embedding_cache: Dict[str, List[torch.Tensor]] = {}

# =============================
# LOAD CLIP ON STARTUP
# =============================
@app.on_event("startup")
def load_clip_on_startup():
    global clip_model, clip_processor

    if clip_model is None:
        hf_token = os.getenv("HF_TOKEN")

        clip_model = CLIPModel.from_pretrained(
            "openai/clip-vit-base-patch32"
        ).to(device)

        clip_processor = CLIPProcessor.from_pretrained(
            "openai/clip-vit-base-patch32",
            token=hf_token,
            use_fast=True
        )

        clip_model.eval()
        print("✅ CLIP loaded")


# =============================
# BATCH IMAGE → EMBEDDINGS
# =============================
def get_embeddings(image_bytes_list: List[bytes]) -> torch.Tensor:
    images = []
    for b in image_bytes_list:
        img = Image.open(io.BytesIO(b)).convert("RGB")
        img.thumbnail((512, 512))  # 🔥 speed win
        images.append(img)

    inputs = clip_processor(
        images=images,
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)

    features = features / features.norm(
        dim=-1, keepdim=True
    ).clamp(min=1e-6)

    return features.cpu()  # (N, 512)


# =============================
# HEALTH CHECK
# =============================
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "CLIP Backend Online (Batched)"
    }


# =============================
# GET IMAGES IN FOLDER
# =============================
@app.get("/get-folder-images")
async def get_folder_images(folder: str):
    try:
        gcp_credentials.refresh(requests.Request())
        prefix = f"{folder}/"

        blobs = storage_client.list_blobs(
            BUCKET_NAME,
            prefix=prefix
        )

        urls = []
        for blob in blobs:
            if blob.name.endswith(".pt"):
                continue

            urls.append(
                blob.generate_signed_url(
                    version="v4",
                    expiration=timedelta(hours=1),
                    service_account_email=gcp_credentials.service_account_email,
                    access_token=gcp_credentials.token,
                    method="GET"
                )
            )

        return {"images": urls}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# =============================
# LIST ITEMS
# =============================
@app.get("/items-list")
async def list_items_with_thumbnails():
    try:
        gcp_credentials.refresh(requests.Request())
        blobs = storage_client.list_blobs(BUCKET_NAME)

        item_map = {}

        for blob in blobs:
            if "/" not in blob.name or blob.name.endswith(".pt"):
                continue

            folder = blob.name.split("/")[0]
            if folder not in item_map:
                item_map[folder] = blob.generate_signed_url(
                    version="v4",
                    expiration=timedelta(hours=1),
                    service_account_email=gcp_credentials.service_account_email,
                    access_token=gcp_credentials.token,
                    method="GET"
                )

        return {
            "items": [
                {"name": k, "thumbnail": v}
                for k, v in item_map.items()
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


# =============================
# REPORT FOUND (BATCHED)
# =============================
@app.post("/found")
async def report_found(
    item_name: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) > 6:
        raise HTTPException(400, "Max 6 images allowed")

    try:
        image_bytes = []
        filenames = []

        for file in files:
            content = await file.read()
            image_bytes.append(content)
            filenames.append(file.filename)

            # Upload image immediately
            bucket.blob(
                f"{item_name}/{file.filename}"
            ).upload_from_string(
                content,
                content_type=file.content_type
            )

        # 🔥 SINGLE CLIP CALL
        embeddings = get_embeddings(image_bytes)

        for filename, emb in zip(filenames, embeddings):
            emb = emb.unsqueeze(0)  # (1,512)

            buffer = io.BytesIO()
            torch.save(emb, buffer)
            buffer.seek(0)

            bucket.blob(
                f"{item_name}/{filename}.pt"
            ).upload_from_string(buffer.read())

            embedding_cache.setdefault(item_name, []).append(emb)

        return {
            "status": "success",
            "message": f"{item_name} registered ({len(files)} images)"
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =============================
# SEARCH (CACHED + FAST)
# =============================
@app.post("/search")
async def search_item(file: UploadFile = File(...)):
    try:
        query_bytes = await file.read()
        query_vec = get_embeddings([query_bytes])  # (1,512)

        # Load cache once
        if not embedding_cache:
            blobs = storage_client.list_blobs(BUCKET_NAME)
            for blob in blobs:
                if not blob.name.endswith(".pt"):
                    continue

                folder = blob.name.split("/")[0]
                vec = torch.load(
                    io.BytesIO(blob.download_as_bytes()),
                    map_location="cpu"
                )

                embedding_cache.setdefault(folder, []).append(vec)

            print("✅ Embedding cache loaded")

        best_score = -1.0
        best_item = None

        for item, vecs in embedding_cache.items():
            master_vec = torch.mean(
                torch.cat(vecs, dim=0),
                dim=0,
                keepdim=True
            )

            master_vec = master_vec / master_vec.norm(
                dim=-1, keepdim=True
            ).clamp(min=1e-6)

            score = torch.sum(query_vec * master_vec).item()

            if score > best_score:
                best_score = score
                best_item = item

        return {
            "match": best_score > 0.8,
            "item": best_item,
            "confidence": round(best_score, 3)
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =============================
# LOCAL RUN
# =============================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080))
    )
