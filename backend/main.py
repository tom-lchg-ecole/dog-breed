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

# Chemins vers le dossier des modèles et les labels (depuis la racine du projet)
BASE = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE / "model"
LABELS_PATH = MODEL_DIR / "labels.json"

# Cache des modèles chargés (nom fichier -> modèle Keras)
models_cache = {}


def get_available_models():
    """Retourne la liste des fichiers .keras dans model/."""
    if not MODEL_DIR.exists():
        return []
    return sorted(p.name for p in MODEL_DIR.glob("*.keras"))


def get_model(model_name: str | None = None):
    """Charge le modèle demandé (ou le premier disponible). Met en cache."""
    available = get_available_models()
    if not available:
        raise FileNotFoundError("Aucun fichier .keras trouvé dans model/")
    name = model_name if model_name and model_name in available else available[0]
    if name not in models_cache:
        path = MODEL_DIR / name
        models_cache[name] = load_model(path)
    return models_cache[name]


# Labels partagés par tous les modèles
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
    return {"status": "ready"}


@app.get("/models")
def list_models():
    """Liste les noms des modèles .keras disponibles dans model/."""
    models = get_available_models()
    return {"models": models}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    model: str | None = None,
):
    """
    Prédit la race du chien sur l'image.
    model: nom du fichier .keras (ex: model_512.keras). Si absent, utilise le premier disponible.
    """
    t0 = time.perf_counter()

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Type de fichier non supporté")

    available = get_available_models()
    if not available:
        raise HTTPException(404, "Aucun modèle .keras trouvé dans model/")
    if model is not None and model not in available:
        raise HTTPException(400, f"Modèle inconnu: {model}")

    try:
        current_model = get_model(model)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e)) from e
    model_used = model if model else available[0]

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

    pred = current_model.predict(batch, verbose=0)
    
    top_3_indices = np.argsort(pred[0])[-3:][::-1]
    
    # Construire la liste des 3 races les plus probables
    top_3_races = []
    for idx in top_3_indices:
        top_3_races.append({
            "race": LABELS[int(idx)],
            "confiance": float(pred[0][idx])
        })

    elapsed_ms = round((time.perf_counter() - t0) * 1000)
    return {
        "top_3": top_3_races,
        "processing_time_ms": elapsed_ms,
        "model_used": model_used,
    }