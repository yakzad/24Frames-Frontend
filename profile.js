const rawUser = localStorage.getItem("user");

if (!rawUser) {
  console.warn("No user in localStorage");
} else {
  const user = JSON.parse(rawUser);

  // avatar
  const avatar = document.querySelector(".profile-avatar");
  avatar.innerHTML = `<img src="${user.avatar}" alt="Profile picture" />`;

  // sidebar avatar
  const sbAvatar = document.querySelector(".sb-avatar");
  if (sbAvatar) {
    sbAvatar.innerHTML = `<img src="${user.avatar}" alt="Profile picture" />`;
  }

  // name
  document.querySelector(".profile-name").textContent = user.name;

  // username
  document.querySelector(".profile-handle").textContent = `@${user.username}`;

  // sidebar
  document.querySelector(".sb-name").textContent = user.name;
  document.querySelector(".sb-handle").textContent = `@${user.username}`;
}
