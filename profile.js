document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token");
    return; // aquí SÍ es válido (está dentro de la función)
  }

  fetch("https://api.24frames.app/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    })
    .then((user) => {
      const avatarSrc = user.avatar || "images/claqueta profile.png";

      // main profile (si existe en esta página)
      const pAvatar = document.querySelector(".profile-avatar");
      const pName = document.querySelector(".profile-name");
      const pHandle = document.querySelector(".profile-handle");

      if (pAvatar)
        pAvatar.innerHTML = `<img src="${avatarSrc}" alt="Profile picture" />`;
      if (pName) pName.textContent = user.name;
      if (pHandle) pHandle.textContent = `@${user.username}`;

      // sidebar (si existe)
      const sbAvatar = document.querySelector(".sb-avatar");
      const sbName = document.querySelector(".sb-name");
      const sbHandle = document.querySelector(".sb-handle");

      if (sbAvatar)
        sbAvatar.innerHTML = `<img src="${avatarSrc}" alt="Profile picture" />`;
      if (sbName) sbName.textContent = user.name;
      if (sbHandle) sbHandle.textContent = `@${user.username}`;
    })
    .catch((err) => {
      console.error("Profile fetch failed", err);
    });
});
