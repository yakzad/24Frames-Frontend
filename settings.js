const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user) window.location.href = "login.html";

const form = document.getElementById("settingsForm");
const feedback = document.getElementById("settingsFeedback");

if (user) {
  if (user.name) document.getElementById("settingName").value = user.name;
  if (user.username) document.getElementById("settingUsername").value = user.username;
}

fetch("https://api.24frames.app/profile", { credentials: "include" })
  .then((r) => r.json())
  .then((data) => {
    const u = data.user;
    if (!u) return;
    document.getElementById("settingName").value = u.name || "";
    document.getElementById("settingUsername").value = u.username || "";
    document.getElementById("settingEmail").value = u.email || "";
    document.getElementById("settingIncludeAdult").checked = u.settings_include_adult === true;
  });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  feedback.textContent = "";

  const body = {};
  const name = form.name.value.trim();
  const username = form.username.value.trim();
  const email = form.email.value.trim();

  if (name) body.name = name;
  if (username) body.username = username;
  if (email) body.email = email;
  body.settings_include_adult = document.getElementById("settingIncludeAdult").checked;

  try {
    const res = await fetch("https://api.24frames.app/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");

    if (data.user) {
      user.name = data.user.name;
      user.username = data.user.username;
      user.settings_include_adult = data.user.settings_include_adult;
      localStorage.setItem("user", JSON.stringify(user));
    }

    feedback.textContent = "Saved!";
    feedback.style.color = "#6fdc8c";
  } catch (err) {
    feedback.textContent = err.message;
    feedback.style.color = "#e05252";
  } finally {
    btn.disabled = false;
  }
});
