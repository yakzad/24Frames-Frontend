const form = document.getElementById("forgotForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    if (!email) {
      alert("Please enter your email");
      return;
    }

    const button = document.getElementById("forgotBtn");
    button.disabled = true;
    button.textContent = "Sending…";

    try {
      const res = await fetch("https://api.24frames.app/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not send magic link");
      }

      form.innerHTML = `
        <p class="subtitle">
          Check your email. We’ve sent you a magic link to enter 24Frames.
        </p>
        <div class="secondary-links">
          <a href="login.html">Back to login</a>
        </div>
      `;
    } catch (err) {
      alert(err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Send magic link";
    }
  });
}
