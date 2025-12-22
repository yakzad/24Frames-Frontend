const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!token || !user) {
  window.location.href = "login.html";
}

// avatar
const avatar = document.querySelector(".profile-avatar");
if (avatar && user.avatar) {
  avatar.innerHTML = `<img src="${user.avatar}" alt="Profile picture">`;
}

// name
const name = document.querySelector(".profile-name");
if (name) {
  name.textContent = user.name || "";
}

// handle
const handle = document.querySelector(".profile-handle");
if (handle) {
  handle.textContent = user.username ? `@${user.username}` : "";
}
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
}
