const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";
const loadedMovieIds = new Set();

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

if (!movieId) {
  window.location.href = "index.html";
}

fetch(`https://api.24frames.app/movie/${movieId}`, {
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
    document.getElementById("movieTitle").textContent =
      data.title || data.original_title;

    document.getElementById("movieDescription").textContent =
      data.overview || "";

    const posterImg = document.getElementById("moviePoster");
    if (data.poster_path) {
      posterImg.src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    } else {
      posterImg.src = "images/no-poster.png";
    }

    const year = data.release_date?.split("-")[0] || "";
    document.getElementById("movieMeta").textContent = year;

    document.getElementById(
      "movieRating"
    ).textContent = `⭐ ${data.vote_average} (${data.vote_count} votes)`;

    function loadVideos(movieId) {
      const videosSection = document.getElementById("videosSection");
      if (!videosSection) return;

      videosSection.innerHTML = "<p>Loading videos...</p>";

      fetch(`http://api.24frames.app/movie/${movieId}/video`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load videos");
          return res.json();
        })
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
              width="100%"
              height="315"
              src="${video.url}"
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

    loadVideos(movieId);
  });
