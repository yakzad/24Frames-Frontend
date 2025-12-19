const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  const button = document.getElementById("loginBtn");
  button.disabled = true;
  button.textContent = "Entering…";

  try {
    const res = await fetch("https://api.24frames.app/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("LOGIN RESPONSE:", data);

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem("token", data.token);

    window.location.href = "home.html";
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Enter 24Frames";
  }
});

const toggleBtn = document.querySelector(".toggle-password");
const passwordInput = document.querySelector('input[name="password"]');

if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    toggleBtn.textContent = isPassword ? "👁️‍🗨️" : "👁";
  });
}
