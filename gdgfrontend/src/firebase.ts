import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBd63yZHdSJlnyuWLUJI1uglCKzCHJWJ9k",

  authDomain: "lostfoundproject-7021e.firebaseapp.com",

  projectId: "lostfoundproject-7021e",

  appId: "1:680513043824:android:e47cd2b2f46fff28a623b5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
