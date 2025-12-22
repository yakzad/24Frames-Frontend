const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";
const loadedMovieIds = new Set();
let isSearching = false;

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
}

const grid = document.getElementById("trendingGrid");

fetch("http://api.24frames.app/movie/popular", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((res) => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
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

      const res = await fetch(
        `https://api.24frames.app/movie/popular?page=${page}`
      );
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        if (showMoreBtn) showMoreBtn.style.display = "none";
        break;
      }

      // 🔑 DEDUPE AQUÍ
      const newOnes = data.results.filter(
        (m) => !movies.some((existing) => existing.id === m.id)
      );

      // 🔑 MISMA REFERENCIA
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

  if (!isSearching) {
    if (searchController) searchController.abort();
    renderMovies(movies);
    if (showMoreBtn) showMoreBtn.style.display = "block";
    return;
  }

  if (showMoreBtn) showMoreBtn.style.display = "none";

  const filtered = movies.filter((movie) => {
    const haystack = [movie.title, movie.original_title, movie.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });

  if (filtered.length > 0) {
    renderMovies(filtered);
    return;
  }

  try {
    if (searchController) searchController.abort();
    searchController = new AbortController();

    const res = await fetch(
      `http://api.24frames.app/movie/search?q=${encodeURIComponent(
        normalized
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: searchController.signal,
      }
    );

    if (!res.ok) {
      console.error("Search failed:", res.status);
      return;
    }

    const data = await res.json();
    console.log("BACKEND RESULTS:", data.results || data);
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

  console.log("searchInput:", searchInput);

  if (!searchInput) return;

  searchForm?.addEventListener("submit", (e) => e.preventDefault());

  searchInput.addEventListener("input", (e) => {
    console.log("INPUT:", e.target.value);
    handleSearch(e.target.value);
  });
});
