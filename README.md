# Dog Breed — Détection de race de chien

Application web pour prédire la race d’un chien à partir d’une photo. Le frontend envoie une image au backend, qui la fait passer dans un modèle TensorFlow/Keras et retourne les 3 races les plus probables avec leur niveau de confiance.

---

## Contenu du projet

| Dossier / fichier  | Rôle                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `frontend/`        | Interface HTML/CSS/JS : glisser-déposer d’image, choix du modèle, affichage des résultats (top 3 races + barres de confiance) |
| `backend/`         | API FastAPI : `POST /predict` (prédiction), `GET /models` (liste des modèles), `GET /health`                                  |
| `model/`           | Modèles Keras (`.keras`) et `labels.json` (120 races)                                                                         |
| `main.ipynb`       | Notebook pour concevoir, entraîner et sauvegarder le modèle (TensorFlow/Keras)                                                |
| `requirements.txt` | Dépendances Python du projet                                                                                                  |

---

## Lancer le projet

### 1. Environnement Python

Créer un environnement virtuel et installer les dépendances :

```bash
python -m venv venv
source venv/bin/activate    # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Démarrer le backend

À la racine du projet :

```bash
uvicorn backend.main:app --reload --port 8000
```

- API : `http://localhost:8000`
- Documentation : `http://localhost:8000/docs`
- Santé : `http://localhost:8000/health`
- Liste des modèles : `http://localhost:8000/models`

### 3. Ouvrir le frontend

Ouvrir `frontend/index.html` dans le navigateur (double‑clic ou glisser dans une fenêtre).

- Choisir un modèle dans la liste (ex. `model_4096.keras`).
- Glisser-déposer une image ou cliquer pour en sélectionner une (JPEG, PNG, WebP).
- Cliquer sur « Analyser l’image ». Les 3 races les plus probables s’affichent avec leur confiance et le temps de traitement.

---

## API

### `POST /predict`

- **Corps** : formulaire avec champ `file` (image).
- **Query** (optionnel) : `model` = nom du fichier `.keras` (ex. `model_512.keras`). Si absent, le premier modèle disponible est utilisé.

**Réponse** (exemple) :

```json
{
  "top_3": [
    { "race": "golden_retriever", "confiance": 0.85 },
    { "race": "labrador_retriever", "confiance": 0.1 },
    { "race": "chesapeake_bay_retriever", "confiance": 0.03 }
  ],
  "processing_time_ms": 120,
  "model_used": "model_4096.keras"
}
```

### `GET /models`

Retourne la liste des noms de modèles `.keras` disponibles dans `model/`.

### `GET /health`

Retourne `{"status": "ready"}` pour vérifier que le backend répond.

---

## Modèles

Les modèles sont des réseaux de neurones (CNN / transfer learning MobileNetV2) entraînés dans `main.ipynb`, sauvegardés en `.keras` dans `model/`. Le fichier `model/labels.json` contient les 120 noms de races dans l’ordre des sorties du modèle.

---

## Résumé

- **Backend** : reçoit l’image, la redimensionne et la pré-traite (MobileNetV2), charge le modèle Keras demandé (ou le premier disponible), renvoie le top 3 des races avec confiance et temps de traitement.
- **Frontend** : envoie l’image en `POST` vers `/predict`, permet de choisir le modèle, affiche les résultats avec barres de confiance.
- **Modèle** : entraînement et sauvegarde dans `main.ipynb` ; chargement et prédiction dans `backend/main.py`.
