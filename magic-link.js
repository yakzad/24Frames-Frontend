const statusText = document.getElementById("statusText");

// leer token del URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
  statusText.textContent = "Invalid or missing magic link.";
} else {
  // Simulación de verificación
  statusText.textContent = "Verifying your magic link…";

  setTimeout(() => {
    // 🔹 MOCK RESULT
    const success = true; // cambia a false para probar error

    if (success) {
      statusText.textContent = "Success! Redirecting…";

      // simular sesión
      localStorage.setItem("token", "mock-session-token");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else {
      statusText.textContent =
        "This link is invalid or expired. Please request a new one.";
    }
  }, 1200);
}
