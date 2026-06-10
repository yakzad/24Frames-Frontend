const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

const params = new URLSearchParams(window.location.search);
const movieId = parseInt(params.get("id"));

if (!movieId) {
  window.location.href = "index.html";
}

fetch(`https://api.24frames.app/movie/${movieId}`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})
  .then((res) => res.json())
  .then((data) => {
    document.getElementById("movieTitle").textContent =
      data.title || data.original_title || "";

    document.getElementById("movieDescription").textContent =
      data.overview || "";

    const posterImg = document.getElementById("moviePoster");
    posterImg.src = data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : "images/no-poster.png";

    const year = data.release_date?.split("-")[0] || "";
    document.getElementById("movieMeta").textContent = year;

    document.getElementById(
      "movieRating"
    ).textContent = `⭐ ${data.vote_average} (${data.vote_count} votes)`;

    loadVideos(movieId);
  })
  .catch((err) => {
    console.error(err);
  });


let favouritesListId = null;
let isFavourited = false;

async function resolveUserId() {
  if (user?.id) return user.id;
  if (!token) return null;
  const res = await fetch("https://api.24frames.app/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!user) user = {};
  user.id = data.user.ID;
  localStorage.setItem("user", JSON.stringify(user));
  return user.id;
}

let allLists = [];

let currentRating = 0;

function highlightClaps(upTo) {
  document.querySelectorAll(".clap").forEach((clap) => {
    clap.classList.toggle("active", parseInt(clap.dataset.score) <= upTo);
  });
}

function initRating() {
  document.getElementById("ratingWrap").style.display = "block";

  fetch(`https://api.24frames.app/movie/${movieId}/rating`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      currentRating = data.score || 0;
      highlightClaps(currentRating);
    })
    .catch(() => {});

  const clapRow = document.getElementById("clapRow");

  clapRow.addEventListener("mouseleave", () => highlightClaps(currentRating));

  document.querySelectorAll(".clap").forEach((clap) => {
    clap.addEventListener("mouseenter", () => highlightClaps(parseInt(clap.dataset.score)));

    clap.addEventListener("click", async () => {
      const score = parseInt(clap.dataset.score);
      try {
        const res = await fetch(`https://api.24frames.app/movie/${movieId}/rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ score }),
        });
        if (!res.ok) throw new Error();
        currentRating = score;
        highlightClaps(score);
      } catch {
        // silent
      }
    });
  });
}

if (token) {
  resolveUserId().then((userId) => {
    if (!userId) return;
    fetch(`https://api.24frames.app/lists/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        allLists = data.lists || [];

        const fav = allLists.find((l) => l.name === "Favourites");
        if (fav) {
          favouritesListId = fav.ID;
          isFavourited = (fav.movie_ids || []).includes(movieId);
          const btn = document.getElementById("favouriteBtn");
          btn.style.display = "inline-block";
          btn.textContent = isFavourited ? "♥" : "♡";
          btn.classList.toggle("favourited", isFavourited);
        }

        if (allLists.length) {
          document.getElementById("listPickerWrap").style.display = "inline-block";
        }
      });

    initRating();
  });
}

// add-to-list dropdown
const addToListBtn = document.getElementById("addToListBtn");
const listPicker = document.getElementById("listPicker");

addToListBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = listPicker.classList.contains("open");
  if (isOpen) { listPicker.classList.remove("open"); return; }

  listPicker.innerHTML = allLists.map((list) => {
    const inList = (list.movie_ids || []).includes(movieId);
    return `<button class="list-picker-item${inList ? " in-list" : ""}" data-list-id="${list.ID}" data-in-list="${inList}">
      ${inList ? "✓ " : ""}${list.name}
    </button>`;
  }).join("");

  listPicker.querySelectorAll(".list-picker-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const listId = item.dataset.listId;
      const inList = item.dataset.inList === "true";
      const method = inList ? "DELETE" : "POST";

      try {
        const res = await fetch(`https://api.24frames.app/lists/${listId}/movies/${movieId}`, {
          method,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();

        const list = allLists.find((l) => l.ID == listId);
        if (list) {
          if (inList) {
            list.movie_ids = (list.movie_ids || []).filter((id) => id !== movieId);
          } else {
            list.movie_ids = [...(list.movie_ids || []), movieId];
          }
        }

        // sync heart button if this is Favourites
        if (list?.name === "Favourites") {
          isFavourited = !inList;
          const heartBtn = document.getElementById("favouriteBtn");
          heartBtn.textContent = isFavourited ? "♥" : "♡";
          heartBtn.classList.toggle("favourited", isFavourited);
        }

        listPicker.classList.remove("open");
      } catch {
        alert("Could not update list.");
      }
    });
  });

  listPicker.classList.add("open");
});

document.addEventListener("click", () => listPicker?.classList.remove("open"));

document.getElementById("favouriteBtn")?.addEventListener("click", async () => {
  if (!token || !favouritesListId) return;
  const btn = document.getElementById("favouriteBtn");
  btn.disabled = true;

  const method = isFavourited ? "DELETE" : "POST";
  try {
    const res = await fetch(
      `https://api.24frames.app/lists/${favouritesListId}/movies/${movieId}`,
      { method, headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error();
    isFavourited = !isFavourited;
    btn.textContent = isFavourited ? "♥" : "♡";
    btn.classList.toggle("favourited", isFavourited);
  } catch {
    alert("Could not update favourites.");
  } finally {
    btn.disabled = false;
  }
});

const tabBtns = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");
const loadedTabs = new Set();

const typeMap = { reviews: "review", theories: "theory", funfacts: "funFact" };
const listIds = { reviews: "reviewsList", theories: "theoriesList", funfacts: "funfactsList" };

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tabSections.forEach((s) => (s.style.display = "none"));
    document.getElementById(btn.dataset.tab + "Section").style.display = "";

    const tab = btn.dataset.tab;
    if (tab !== "videos" && token && !loadedTabs.has(tab)) {
      loadedTabs.add(tab);
      loadPosts(tab);
    }
  });
});

if (!token) {
  const placeholders = [
    { username: "cinephile42", body: "This film completely changed how I see modern cinema. The cinematography alone deserves an award." },
    { username: "reel_thoughts", body: "A masterclass in storytelling. Every frame feels intentional and the performances are outstanding." },
    { username: "framebyframe", body: "I've watched this three times and keep noticing new details. Highly recommended." },
  ];

  ["reviews", "theories", "funfacts"].forEach((tab) => {
    document.getElementById(tab + "Section").classList.add("locked");
    document.getElementById(listIds[tab]).innerHTML = placeholders
      .map((p) => `<div class="review-card"><h4>@${p.username}</h4><p class="review-excerpt">${p.body}</p></div>`)
      .join("");
  });
}

async function loadPosts(tab) {
  const listEl = document.getElementById(listIds[tab]);
  listEl.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const res = await fetch(`https://api.24frames.app/movie/${movieId}/posts?type=${typeMap[tab]}`);
    const data = await res.json();
    renderPosts(data.posts || [], listEl, tab);
  } catch {
    listEl.innerHTML = "<p class='muted'>Failed to load.</p>";
  }
}

function renderPosts(posts, container, tab) {
  const labels = { reviews: "reviews", theories: "theories", funfacts: "fun facts" };
  if (!posts.length) {
    container.innerHTML = `<p class="muted">No ${labels[tab]} yet. Be the first!</p>`;
    return;
  }
  container.innerHTML = posts
    .map((p) => `<div class="review-card"><h4>@${p.username}</h4><p class="review-excerpt">${p.body}</p></div>`)
    .join("");
}

async function submitPost(e, tab, endpoint) {
  e.preventDefault();
  const content = e.target.content.value.trim();
  if (!content) return;
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch(`https://api.24frames.app/movie/${movieId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to post");
    }
    e.target.reset();
    loadedTabs.delete(tab);
    loadPosts(tab);
  } catch {
    alert("Failed to post. Please try again.");
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("reviewForm")?.addEventListener("submit", (e) => submitPost(e, "reviews", "review"));
document.getElementById("theoryForm")?.addEventListener("submit", (e) => submitPost(e, "theories", "theory"));
document.getElementById("funFactForm")?.addEventListener("submit", (e) => submitPost(e, "funfacts", "fun-fact"));

function loadVideos(movieId) {
  const videosSection = document.getElementById("videosSection");
  if (!videosSection) return;

  videosSection.innerHTML = "<p>Loading videos...</p>";

  fetch(`https://api.24frames.app/movie/${movieId}/video`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => res.json())
    .then((videos) => {
      videosSection.innerHTML = "";

      if (!Array.isArray(videos) || videos.length === 0) {
        videosSection.innerHTML = "<p>No videos available yet.</p>";
        return;
      }

      videos.forEach((video) => {
        const wrapper = document.createElement("div");
        wrapper.className = "video-item";

        wrapper.innerHTML = `
          <h3>${video.name || "Untitled video"}</h3>
          <iframe
            src="${video.url}"
            width="100%"
            height="315"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        `;

        videosSection.appendChild(wrapper);
      });
    })
    .catch((err) => {
      console.error(err);
      videosSection.innerHTML =
        "<p>Error loading videos. Please try again later.</p>";
    });
}
