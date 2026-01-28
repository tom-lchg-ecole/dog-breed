/**
 * Envoie l'image sélectionnée au backend via POST multipart/form-data.
 */
function sendImage() {
  const input = document.getElementById("imageInput");
  const file = input?.files?.[0];

  if (!file) {
    console.warn("Aucun fichier sélectionné.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:8000/predict", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.error("Erreur lors de l'envoi:", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sendBtn").addEventListener("click", sendImage);
});
