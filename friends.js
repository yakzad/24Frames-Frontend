const token = localStorage.getItem("token");
let sessionUser = JSON.parse(localStorage.getItem("user") || "null");

let currentUserId = null;
const followingIds = new Set();

async function resolveUserId() {
  if (sessionUser?.id) return sessionUser.id;
  if (!token) return null;
  const res = await fetch("https://api.24frames.app/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!sessionUser) sessionUser = {};
  sessionUser.id = data.user.ID;
  localStorage.setItem("user", JSON.stringify(sessionUser));
  return sessionUser.id;
}

function avatarUrl(user) {
  return user.avatar || "images/claqueta%20profile.png";
}

async function toggleFollow(userId, btn) {
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const isFollowing = followingIds.has(userId);
  btn.disabled = true;

  try {
    const res = await fetch(`https://api.24frames.app/users/${userId}/follow`, {
      method: isFollowing ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();

    if (isFollowing) {
      followingIds.delete(userId);
      btn.className = "follow-btn follow";
      btn.textContent = "Follow";
      // remove card from following section if present
      const card = document.querySelector(`#followingList .user-card[data-user-id="${userId}"]`);
      if (card) {
        card.remove();
        const list = document.getElementById("followingList");
        if (!list.querySelector(".user-card")) {
          list.innerHTML = "<p class='muted'>You're not following anyone yet. Search for users to follow!</p>";
        }
      }
    } else {
      followingIds.add(userId);
      btn.className = "follow-btn following";
      btn.textContent = "Following";
    }
  } catch {
    // silent fail
  } finally {
    btn.disabled = false;
  }
}

function renderUserCard(user) {
  const isFollowing = followingIds.has(user.ID);
  const isOwn = user.ID === currentUserId;

  const card = document.createElement("a");
  card.className = "user-card";
  card.href = `profile.html?id=${user.ID}`;
  card.dataset.userId = user.ID;

  const img = document.createElement("div");
  img.className = "user-card-avatar";
  img.innerHTML = `<img src="${avatarUrl(user)}" alt="avatar" />`;

  const info = document.createElement("div");
  info.className = "user-card-info";
  info.innerHTML = `
    <div class="user-card-name">${user.name || user.username}</div>
    <div class="user-card-handle">@${user.username}</div>
  `;

  card.appendChild(img);
  card.appendChild(info);

  if (!isOwn && token) {
    const btn = document.createElement("button");
    btn.className = `follow-btn ${isFollowing ? "following" : "follow"}`;
    btn.textContent = isFollowing ? "Following" : "Follow";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFollow(user.ID, btn);
    });
    card.appendChild(btn);
  }

  return card;
}

async function loadFollowing() {
  const container = document.getElementById("followingList");
  container.innerHTML = "<p class='muted'>Loading…</p>";

  try {
    const res = await fetch(`https://api.24frames.app/users/${currentUserId}/following`);
    const data = await res.json();
    const users = data.users || [];

    users.forEach((u) => followingIds.add(u.ID));

    if (!users.length) {
      container.innerHTML =
        "<p class='muted'>You're not following anyone yet. Search for users to follow!</p>";
      return;
    }

    container.innerHTML = "";
    users.forEach((u) => container.appendChild(renderUserCard(u)));
  } catch {
    container.innerHTML = "<p class='muted'>Could not load following list.</p>";
  }
}

let searchTimer = null;

document.getElementById("userSearchInput").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  const section = document.getElementById("searchResultsSection");

  clearTimeout(searchTimer);

  if (q.length < 2) {
    section.style.display = "none";
    return;
  }

  searchTimer = setTimeout(async () => {
    section.style.display = "";
    const container = document.getElementById("searchResults");
    container.innerHTML = "<p class='muted'>Searching…</p>";

    try {
      const res = await fetch(
        `https://api.24frames.app/users/search?query=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const users = data.users || [];

      if (!users.length) {
        container.innerHTML = "<p class='muted'>No users found.</p>";
        return;
      }

      container.innerHTML = "";
      users.forEach((u) => container.appendChild(renderUserCard(u)));
    } catch {
      container.innerHTML = "<p class='muted'>Search failed.</p>";
    }
  }, 300);
});

async function init() {
  currentUserId = await resolveUserId();

  if (!currentUserId) {
    document.getElementById("followingList").innerHTML =
      "<p class='muted'>Log in to see who you're following.</p>";
    return;
  }

  await loadFollowing();
}

init();
