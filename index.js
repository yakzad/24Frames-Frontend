const user = JSON.parse(localStorage.getItem("user") || "null");
const safeMode = user?.settings_include_adult ? "false" : "true";

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

async function loadFriendActivity() {
  if (!user) return;

  const section = document.getElementById("activitySection");
  const feed = document.getElementById("activityFeed");
  if (!section || !feed) return;

  try {
    const res = await fetch("https://api.24frames.app/activity/friends", {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    const activities = data.activities || [];

    section.style.display = "";

    if (!activities.length) {
      feed.innerHTML = `<p class="activity-empty">No activity yet. <a href="friends.html">Follow some friends</a> to see what they're watching!</p>`;
      return;
    }

    const movieIds = [...new Set(activities.map((a) => a.movie_id))];
    const movieMap = {};
    await Promise.all(
      movieIds.map(async (id) => {
        try {
          const r = await fetch(`https://api.24frames.app/movie/${id}`);
          if (r.ok) movieMap[id] = await r.json();
        } catch {}
      })
    );

    function renderActivityItem(a) {
      const movie = movieMap[a.movie_id];
      const posterUrl = movie?.poster_path
        ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
        : "images/claqueta%20profile.png";
      const title = escapeHtml(movie?.title || movie?.original_title || "a movie");
      const username = escapeHtml(a.username);

      if (a.kind === "rating") {
        const filled = "🎬".repeat(a.score);
        const empty = `<span style="opacity:0.2">${"🎬".repeat(5 - a.score)}</span>`;
        return `
          <a class="activity-item" href="movie.html?id=${a.movie_id}">
            <img class="activity-poster" src="${posterUrl}" alt="${title}" />
            <div class="activity-body">
              <p class="activity-text"><strong>@${username}</strong> rated <strong>${title}</strong></p>
              <p class="activity-claps">${filled}${empty}</p>
              <p class="activity-time">${timeAgo(a.timestamp)}</p>
            </div>
          </a>
        `;
      }

      const typeLabel = { review: "a review", theory: "a theory", funFact: "a fun fact" }[a.post_type] || "a post";
      const tabName = { review: "reviews", theory: "theories", funFact: "funfacts" }[a.post_type] || "reviews";
      const rawExcerpt = a.body?.length > 80 ? a.body.slice(0, 80) + "…" : a.body;
      const excerpt = escapeHtml(rawExcerpt);
      const postUrl = a.post_id
        ? `movie.html?id=${a.movie_id}&post=${a.post_id}&tab=${tabName}`
        : `movie.html?id=${a.movie_id}`;
      return `
        <a class="activity-item" href="${postUrl}">
          <img class="activity-poster" src="${posterUrl}" alt="${title}" />
          <div class="activity-body">
            <p class="activity-text"><strong>@${username}</strong> wrote ${typeLabel} about <strong>${title}</strong></p>
            ${excerpt ? `<p class="activity-excerpt">"${excerpt}"</p>` : ""}
            <p class="activity-time">${timeAgo(a.timestamp)}</p>
          </div>
        </a>
      `;
    }

    const INITIAL = 3;
    feed.innerHTML = activities.slice(0, INITIAL).map(renderActivityItem).join("");

    if (activities.length > INITIAL) {
      const btn = document.createElement("button");
      btn.className = "show-more-btn activity-show-more";
      btn.textContent = "Show more";
      btn.addEventListener("click", () => {
        feed.innerHTML = activities.map(renderActivityItem).join("");
        btn.remove();
      });
      section.appendChild(btn);
    }
  } catch {}
}

loadFriendActivity();

const loadedMovieIds = new Set();
let isSearching = false;

const grid = document.getElementById("trendingGrid");

fetch(`https://api.24frames.app/movie/popular?safe=${safeMode}`)
  .then((res) => {
    if (res.status === 401 || res.status === 403) {
      console.warn("Unauthorized – session expired");
      return;
    }
    return res.json();
  })
  .then((data) => {
    movies = data.results || data;
    grid.innerHTML = "";
    loadedMovieIds.clear();
    renderMovies(movies);
  })
  .catch((err) => {
    console.error("Failed to load popular movies:", err);
  });

function renderMovies(list) {
  if (!grid || !Array.isArray(list)) return;

  grid.innerHTML = "";

  list.forEach((m) => {
    if (!m || !m.poster_path || !m.id) return;

    const card = document.createElement("div");
    card.className = "movie-card";

    const img = document.createElement("img");
    img.src = "https://image.tmdb.org/t/p/w300" + m.poster_path;
    img.alt = m.title || m.original_title || m.name || "Movie poster";
    img.loading = "lazy";

    card.appendChild(img);

    card.addEventListener("click", () => {
      window.location.href = "movie.html?id=" + m.id;
    });

    grid.appendChild(card);
  });
}

let page = 0;
let isLoading = false;
let hasMore = true;
let movies = [];

const showMoreBtn = document.getElementById("showMoreBtn");

async function showMore() {
  if (isLoading || !hasMore) return;

  isLoading = true;
  if (showMoreBtn) showMoreBtn.disabled = true;

  try {
    for (let i = 0; i < 2; i++) {
      page++;

      const res = await fetch(`https://api.24frames.app/movie/popular?page=${page}&safe=${safeMode}`);
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        if (showMoreBtn) showMoreBtn.style.display = "none";
        break;
      }

      const newOnes = data.results.filter(
        (m) => !movies.some((existing) => existing.id === m.id)
      );

      movies.push(...newOnes);
      renderMovies(movies);
    }
  } catch (e) {
    console.error(e);
  } finally {
    isLoading = false;
    if (showMoreBtn) showMoreBtn.disabled = false;
  }
}

if (showMoreBtn) {
  showMoreBtn.addEventListener("click", showMore);
}

let searchController = null;

async function handleSearch(query) {
  if (!Array.isArray(movies)) return;

  const normalized = query.toLowerCase().trim();
  isSearching = normalized.length > 0;

  const activitySection = document.getElementById("activitySection");

  if (!isSearching) {
    if (searchController) searchController.abort();
    renderMovies(movies);
    if (showMoreBtn) showMoreBtn.style.display = "block";
    if (activitySection) activitySection.style.display = "";
    return;
  }

  if (activitySection) activitySection.style.display = "none";
  if (showMoreBtn) showMoreBtn.style.display = "none";

  try {
    if (searchController) searchController.abort();
    searchController = new AbortController();

    const res = await fetch(
      `https://api.24frames.app/movie/search?query=${encodeURIComponent(normalized)}&safe=${safeMode}`,
      { signal: searchController.signal }
    );

    if (!res.ok) {
      console.error("Search failed:", res.status);
      return;
    }

    const data = await res.json();
    renderMovies(data.results || data);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Backend search failed:", err);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");

  if (!searchInput) return;

  searchForm?.addEventListener("submit", (e) => e.preventDefault());

  searchInput.addEventListener("input", (e) => {
    handleSearch(e.target.value);
  });

  const urlQ = new URLSearchParams(location.search).get("q");
  if (urlQ) {
    searchInput.value = urlQ;
    handleSearch(urlQ);
  }
});
