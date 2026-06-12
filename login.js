const user = JSON.parse(localStorage.getItem("user") || "null");

if (user) {
  window.location.href = "index.html";
} else {
  localStorage.removeItem("user");
}

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
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.status === 429) {
      throw new Error(data.error || "Too many login attempts. Please wait a minute and try again.");
    }
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    if (data.user) {
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user.ID,
          name: data.user.name,
          username: data.user.username,
          avatar: data.user.avatar || "",
          settings_include_adult: data.user.settings_include_adult || false,
        })
      );
    }

    window.location.href = "index.html";
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
