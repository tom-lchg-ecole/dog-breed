import io
import json
import time
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.models import load_model

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Chemins vers le modèle et les labels (depuis la racine du projet)
BASE = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE / "model" / "dog_breed_model.h5"
LABELS_PATH = BASE / "model" / "labels.json"

# Chargement du modèle et des labels au démarrage
model = load_model(MODEL_PATH)

if LABELS_PATH.exists():
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        LABELS = json.load(f)
else:
    # Fallback : ordre alphabétique des 120 races depuis sample_submission
    with open(BASE / "dataset" / "sample_submission.csv", "r", encoding="utf-8") as f:
        header = f.readline().strip()
    LABELS = sorted([c for c in header.split(",") if c != "id"])


@app.get("/health")
def health():
    """Indique que le serveur et le modèle sont prêts."""
    return {"status": "ready"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    t0 = time.perf_counter()

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Type de fichier non supporté")

    contents = await file.read()

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Image illisible ou corrompue: {e}") from e

    # Préprocessing identique à l'entraînement : resize 224x224 + preprocess MobileNetV2
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32)
    arr = mobilenet_preprocess(arr)
    batch = np.expand_dims(arr, axis=0)

    pred = model.predict(batch, verbose=0)
    idx = int(pred[0].argmax())
    confiance = float(pred[0][idx])
    race = LABELS[idx]

    elapsed_ms = round((time.perf_counter() - t0) * 1000)
    return {"race": race, "confiance": confiance, "processing_time_ms": elapsed_ms}
