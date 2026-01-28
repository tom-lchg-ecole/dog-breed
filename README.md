# Dog Breed — Détection de race de chien

Application web pour prédire la race d’un chien à partir d’une photo.  
Le frontend envoie une image, le backend la reçoit et (à terme) la fait passer dans un modèle TensorFlow pour retourner la race.

---

## Contenu du projet

| Dossier / fichier  | Rôle                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `frontend/`        | Page HTML + JavaScript pour choisir une image et l’envoyer au backend          |
| `backend/`         | API FastAPI avec la route `POST /predict` qui reçoit l’image                   |
| `main.ipynb`       | Notebook pour concevoir, entraîner et sauvegarder le modèle (TensorFlow/Keras) |
| `requirements.txt` | Dépendances Python du projet                                                   |

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

L’API est disponible sur `http://localhost:8000`.  
Docs : `http://localhost:8000/docs`.

### 3. Ouvrir le frontend

Ouvrir `frontend/index.html` dans le navigateur (double‑clic ou glisser dans une fenêtre).  
Choisir une image (JPEG, PNG, WebP), cliquer sur « Envoyer ». La réponse apparaît dans la console (F12 → Console).

---

## Résumé

- **Backend** : reçoit l’image, valide le type, renvoie pour l’instant un JSON type `{"received": true, "filename": "..."}`. L’appel au modèle reste à brancher.
- **Frontend** : envoie l’image en `POST` vers `http://localhost:8000/predict`.
- **Modèle** : à entraîner dans `main.ipynb` (CNN / transfer learning sur des images de chiens), sauvegarder, puis charger et utiliser dans `backend/main.py`.
