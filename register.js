const form = document.getElementById("registerForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirm_password.value;

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const button = document.getElementById("registerBtn");
    button.disabled = true;
    button.textContent = "Creating…";

    try {
      const res = await fetch("https://api.24frames.app/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Account creation failed");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "index.html";
      } else {
        window.location.href = "login.html";
      }
    } catch (err) {
      alert(err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Create account";
    }
  });
}
