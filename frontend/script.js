const API = "http://localhost:8000";
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("imageInput");
const sendBtn = document.getElementById("sendBtn");
const serverStatus = document.getElementById("serverStatus");

function setState(state, message) {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
  sendBtn.disabled = state === "loading";
  inputEl.disabled = state === "loading";
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

  const formData = new FormData();
  formData.append("file", file);

  fetch(API + "/predict", {
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
      const p =
        data.processing_time_ms != null
          ? ` (${data.processing_time_ms} ms)`
          : "";

      // Afficher les 3 races les plus probables
      if (data.top_3 && Array.isArray(data.top_3)) {
        const racesText = data.top_3
          .map(
            (item, index) =>
              `${index + 1}. ${item.race} (${(item.confiance * 100).toFixed(
                1
              )}%)`
          )
          .join(" — ");
        setState("success", `Top 3 : ${racesText}${p}`);
      } else {
        // Fallback pour compatibilité avec l'ancien format
        const race = data.race || "Inconnue";
        const confiance = data.confiance || 0;
        setState(
          "success",
          `Race : ${race} — Confiance : ${(confiance * 100).toFixed(1)}%${p}`
        );
      }
    })
    .catch((err) => {
      setState("error", "Erreur : " + (err.message || "échec de la requête"));
    });
}

function checkServer() {
  fetch(API + "/health")
    .then((r) => r.json())
    .then((d) => {
      serverStatus.textContent =
        d.status === "ready" ? "Serveur prêt" : "Serveur indisponible";
    })
    .catch(() => {
      serverStatus.textContent = "Serveur indisponible";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  checkServer();
  sendBtn.addEventListener("click", sendImage);
});
