import os
import io
from typing import List, Dict

import torch
from PIL import Image

# FastAPI
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware

# Google Cloud
from google.cloud import storage
from google.auth import default

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
# CLIP SINGLETON
# =============================
clip_model: CLIPModel | None = None
clip_processor: CLIPProcessor | None = None

# =============================
# CACHES (🔥 FAST)
# =============================
embedding_cache: Dict[str, List[torch.Tensor]] = {}
folder_images_cache: Dict[str, List[str]] = {}

# =============================
# LOAD CLIP + CACHE ON STARTUP
# =============================
@app.on_event("startup")
def startup():
    global clip_model, clip_processor

    # ---- Load CLIP ----
    clip_model = CLIPModel.from_pretrained(
        "openai/clip-vit-base-patch32"
    ).to(device)

    clip_processor = CLIPProcessor.from_pretrained(
        "openai/clip-vit-base-patch32",
        use_fast=True
    )

    clip_model.eval()
    print("✅ CLIP loaded")

    # ---- Preload GCS data ----
    print("⏳ Preloading embeddings + images from GCS...")

    blobs = storage_client.list_blobs(BUCKET_NAME)

    for blob in blobs:
        parts = blob.name.split("/")
        if len(parts) < 2:
            continue

        folder, filename = parts[0], parts[1]

        # Cache images
        if not filename.endswith(".pt"):
            folder_images_cache.setdefault(folder, []).append(filename)
            continue

        # Cache embeddings
        vec = torch.load(
            io.BytesIO(blob.download_as_bytes()),
            map_location="cpu"
        )
        embedding_cache.setdefault(folder, []).append(vec)

    print(
        f"✅ Loaded {len(embedding_cache)} items | "
        f"{sum(len(v) for v in folder_images_cache.values())} images"
    )

# =============================
# EMBEDDING UTILS
# =============================
def get_embeddings(image_bytes_list: List[bytes]) -> torch.Tensor:
    images = []

    for b in image_bytes_list:
        img = Image.open(io.BytesIO(b)).convert("RGB")
        img.thumbnail((512, 512))
        images.append(img)

    inputs = clip_processor(
        images=images,
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        feats = clip_model.get_image_features(**inputs)

    feats = feats / feats.norm(dim=-1, keepdim=True).clamp(min=1e-6)
    return feats.cpu()

# =============================
# BACKGROUND TASK
# =============================
def generate_and_upload_embeddings(
    item_name: str,
    image_bytes: List[bytes],
    filenames: List[str]
):
    try:
        embeddings = get_embeddings(image_bytes)

        for filename, emb in zip(filenames, embeddings):
            emb = emb.unsqueeze(0)

            buffer = io.BytesIO()
            torch.save(emb, buffer)
            buffer.seek(0)

            bucket.blob(
                f"{item_name}/{filename}.pt"
            ).upload_from_string(buffer.read())

            embedding_cache.setdefault(item_name, []).append(emb)

        print(f"✅ Embeddings done for {item_name}")

    except Exception as e:
        print(f"❌ BG embedding failed: {e}")

# =============================
# HEALTH
# =============================
@app.get("/")
async def root():
    return {"status": "online"}

# =============================
# ITEM LIST (⚡ INSTANT)
# =============================
@app.get("/items")
async def list_items():
    return {
        "items": list(folder_images_cache.keys())
    }

# =============================
# GET ITEM IMAGES (⚡ INSTANT)
# =============================
from datetime import timedelta

@app.get("/items/{item_name}/images")
async def get_item_images(item_name: str):
    if item_name not in folder_images_cache:
        raise HTTPException(404, "Item not found")

    urls = []

    for filename in folder_images_cache[item_name]:
        blob = bucket.blob(f"{item_name}/{filename}")

        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=30),
            method="GET",
            service_account_email=gcp_credentials.service_account_email,
        )


        urls.append(url)

    return {"images": urls}


# =============================
# REPORT FOUND (UNCHANGED)
# =============================
@app.post("/found")
async def report_found(
    background_tasks: BackgroundTasks,
    item_name: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) > 6:
        raise HTTPException(400, "Max 6 images allowed")

    image_bytes = []
    filenames = []

    try:
        for file in files:
            content = await file.read()
            image_bytes.append(content)
            filenames.append(file.filename)

            bucket.blob(
                f"{item_name}/{file.filename}"
            ).upload_from_string(
                content,
                content_type=file.content_type
            )

            folder_images_cache.setdefault(item_name, []).append(file.filename)

        background_tasks.add_task(
            generate_and_upload_embeddings,
            item_name,
            image_bytes,
            filenames
        )

        return {
            "status": "success",
            "message": f"{item_name} uploaded. Processing embeddings..."
        }

    except Exception as e:
        raise HTTPException(500, str(e))

# =============================
# SEARCH (⚡ NO GCS CALLS)
# =============================
@app.post("/search")
async def search_item(file: UploadFile = File(...)):
    try:
        query_bytes = await file.read()
        query_vec = get_embeddings([query_bytes])

        best_score = -1.0
        best_item = None

        for item, vecs in embedding_cache.items():
            master = torch.mean(
                torch.cat(vecs, dim=0),
                dim=0,
                keepdim=True
            )

            master = master / master.norm(dim=-1, keepdim=True)
            score = torch.sum(query_vec * master).item()

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
# RUN
# =============================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080))
    )
