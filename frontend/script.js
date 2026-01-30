const API = "http://localhost:8000";
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("imageInput");
const sendBtn = document.getElementById("sendBtn");
const serverStatus = document.getElementById("serverStatus");
const modelSelect = document.getElementById("modelSelect");
const dropzone = document.getElementById("dropzone");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const results = document.getElementById("results");
const racesList = document.getElementById("racesList");
const processingTime = document.getElementById("processingTime");

function setState(state, message) {
  if (message) {
    statusEl.textContent = message;
    statusEl.className = `status ${state}`;
    statusEl.style.display = "block";
  } else {
    statusEl.style.display = "none";
  }
  sendBtn.disabled = state === "loading";
  inputEl.disabled = state === "loading";
}

/**
 * Affiche l'aperçu de l'image sélectionnée
 */
function showImagePreview(file) {
  if (!file) {
    imagePreview.classList.remove("show");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    imagePreview.classList.add("show");
  };
  reader.readAsDataURL(file);
}

/**
 * Met à jour l'affichage des résultats avec des sliders
 */
function displayResults(data) {
  if (data.top_3 && Array.isArray(data.top_3)) {
    racesList.innerHTML = "";

    data.top_3.forEach((item, index) => {
      const percentage = (item.confiance * 100).toFixed(1);
      const raceItem = document.createElement("div");
      raceItem.className = "race-item";

      raceItem.innerHTML = `
        <div class="race-header">
          <span class="race-name">${index + 1}. ${item.race}</span>
          <span class="race-percentage">${percentage}%</span>
        </div>
        <div class="slider-container">
          <div class="slider-track" style="width: ${percentage}%"></div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="${percentage}" 
            class="slider" 
            disabled
            aria-label="Confiance pour ${item.race}"
          >
        </div>
      `;

      racesList.appendChild(raceItem);
    });

    let timeText = "";
    if (data.processing_time_ms != null) {
      timeText = `Temps de traitement : ${data.processing_time_ms} ms`;
    }
    if (data.model_used) {
      timeText = timeText
        ? `${timeText} — Modèle : ${data.model_used}`
        : `Modèle utilisé : ${data.model_used}`;
    }
    processingTime.textContent = timeText || "";

    results.classList.add("show");
  } else {
    // Fallback pour compatibilité avec l'ancien format
    const race = data.race || "Inconnue";
    const confiance = data.confiance || 0;
    const percentage = (confiance * 100).toFixed(1);

    racesList.innerHTML = `
      <div class="race-item">
        <div class="race-header">
          <span class="race-name">${race}</span>
          <span class="race-percentage">${percentage}%</span>
        </div>
        <div class="slider-container">
          <div class="slider-track" style="width: ${percentage}%"></div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="${percentage}" 
            class="slider" 
            disabled
            aria-label="Confiance pour ${race}"
          >
        </div>
      </div>
    `;

    results.classList.add("show");
  }
}

/**
 * Envoie l'image sélectionnée au backend via POST multipart/form-data.
 */
function sendImage() {
  const file = inputEl?.files?.[0];

  if (!file) {
    setState("error", "Veuillez sélectionner une image.");
    return;
  }

  setState("loading", "Analyse en cours…");
  results.classList.remove("show");

  const formData = new FormData();
  formData.append("file", file);

  const selectedModel = modelSelect?.value || "";
  const predictUrl = selectedModel
    ? `${API}/predict?model=${encodeURIComponent(selectedModel)}`
    : `${API}/predict`;

  fetch(predictUrl, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        return response
          .json()
          .catch(() => ({ detail: `Erreur HTTP ${response.status}` }))
          .then((body) => {
            const d = body.detail;
            const msg =
              typeof d === "string"
                ? d
                : Array.isArray(d) && d[0]?.msg
                ? d[0].msg
                : body.message || `Erreur ${response.status}`;
            throw new Error(msg);
          });
      }
      return response.json();
    })
    .then((data) => {
      setState("success", "Analyse terminée avec succès !");
      displayResults(data);
    })
    .catch((err) => {
      setState("error", "Erreur : " + (err.message || "échec de la requête"));
      results.classList.remove("show");
    });
}

function checkServer() {
  fetch(API + "/health")
    .then((r) => r.json())
    .then((d) => {
      if (d.status === "ready") {
        serverStatus.textContent = "✓ Serveur prêt";
        serverStatus.className = "server-status ready";
      } else {
        serverStatus.textContent = "✗ Serveur indisponible";
        serverStatus.className = "server-status error";
      }
    })
    .catch(() => {
      serverStatus.textContent = "✗ Serveur indisponible";
      serverStatus.className = "server-status error";
    });
}

/**
 * Remplit le sélecteur de modèles depuis l'API /models
 */
function loadModels() {
  fetch(API + "/models")
    .then((r) => r.json())
    .then((d) => {
      const list = d.models || [];
      modelSelect.innerHTML = "";
      if (list.length === 0) {
        modelSelect.innerHTML = '<option value="">Aucun modèle disponible</option>';
        return;
      }
      list.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      });
    })
    .catch(() => {
      modelSelect.innerHTML = '<option value="">Erreur chargement des modèles</option>';
    });
}

// Gestion de la dropzone
dropzone.addEventListener("click", () => {
  inputEl.click();
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    inputEl.files = files;
    showImagePreview(files[0]);
  }
});

// Gestion de la sélection de fichier
inputEl.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) {
    showImagePreview(file);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  checkServer();
  loadModels();
  sendBtn.addEventListener("click", sendImage);

  // Vérifier le serveur toutes les 5 secondes
  setInterval(checkServer, 5000);
});
