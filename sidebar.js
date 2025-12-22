(() => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!token || !user) {
    window.location.href = "login.html";
    return;
  }

  const avatarEl = document.querySelector(".sb-avatar");
  const nameEl = document.querySelector(".sb-name");
  const handleEl = document.querySelector(".sb-handle");

  if (avatarEl && user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="Profile picture">`;
  }

  if (nameEl) nameEl.textContent = user.name || "";
  if (handleEl) handleEl.textContent = user.username ? `@${user.username}` : "";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
})();
