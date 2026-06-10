const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

const params = new URLSearchParams(window.location.search);
const listId = params.get("id");

if (!listId) window.location.href = "lists.html";

const moviesGrid = document.getElementById("moviesGrid");

function makeRatingOverlay(score) {
  const div = document.createElement("div");
  div.className = "card-rating";
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement("span");
    span.className = "cr-clap" + (i <= score ? " filled" : "");
    span.textContent = "🎬";
    div.appendChild(span);
  }
  return div;
}

fetch(`https://api.24frames.app/list/${listId}`)
  .then((res) => res.json())
  .then((data) => {
    const list = data.list;
    if (!list) {
      window.location.href = "lists.html";
      return;
    }

    document.getElementById("listTitle").textContent = list.name;
    document.title = `24Frames — ${list.name}`;

    const movieIds = list.movie_ids || [];

    if (movieIds.length === 0) {
      moviesGrid.innerHTML = "<p class='muted'>This list is empty.</p>";
      return;
    }

    moviesGrid.innerHTML = "<p class='muted'>Loading…</p>";

    const ownerId = list.created_by;

    Promise.all([
      Promise.all(
        movieIds.map((id) =>
          fetch(`https://api.24frames.app/movie/${id}`)
            .then((r) => r.json())
            .catch(() => null)
        )
      ),
      fetch(`https://api.24frames.app/users/${ownerId}/ratings`)
        .then((r) => r.json())
        .catch(() => ({ ratings: {} })),
    ]).then(([movies, ratingData]) => {
      const ratingMap = ratingData.ratings || {};

      moviesGrid.innerHTML = "";
      movies.filter(Boolean).forEach((movie) => {
        if (!movie.poster_path) return;

        const card = document.createElement("div");
        card.className = "movie-card";

        const img = document.createElement("img");
        img.src = "https://image.tmdb.org/t/p/w300" + movie.poster_path;
        img.alt = movie.title || movie.original_title || "";
        img.loading = "lazy";

        card.appendChild(img);

        const score = ratingMap[movie.id] || 0;
        if (score > 0) {
          card.appendChild(makeRatingOverlay(score));
        }

        card.addEventListener("click", () => {
          window.location.href = "movie.html?id=" + movie.id;
        });

        moviesGrid.appendChild(card);
      });

      if (!moviesGrid.querySelector(".movie-card")) {
        moviesGrid.innerHTML = "<p class='muted'>No movies to show.</p>";
      }
    });
  })
  .catch(() => {
    moviesGrid.innerHTML = "<p class='muted'>Failed to load list.</p>";
  });
