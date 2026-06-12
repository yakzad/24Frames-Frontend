const user = JSON.parse(localStorage.getItem("user") || "null");

const params = new URLSearchParams(window.location.search);
const movieId = parseInt(params.get("id"));

if (!movieId) {
  window.location.href = "index.html";
}

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

fetch(`https://api.24frames.app/movie/${movieId}`, {
  credentials: user ? "include" : "omit",
})
  .then((res) => res.json())
  .then((data) => {
    const title = data.title || data.original_title || "";

    document.getElementById("movieTitle").textContent = title;
    document.getElementById("movieDescription").textContent = data.overview || "";

    const posterImg = document.getElementById("moviePoster");
    posterImg.src = data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : "images/no-poster.png";

    const year = data.release_date?.split("-")[0] || "";
    document.getElementById("movieMeta").textContent = year;

    document.getElementById(
      "movieRating"
    ).textContent = `⭐ ${data.vote_average} (${data.vote_count} votes)`;

    currentMovieTitle = title;
    currentMoviePoster = data.poster_path || "";

    const pageTitle = `${title} — 24Frames`;
    const desc = data.overview
      ? data.overview.slice(0, 200)
      : `Reviews, theories and videos about ${title} on 24Frames.`;
    const posterUrl = data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : "https://24frames.app/images/24frames1.png";

    document.title = pageTitle;
    document.querySelector('meta[name="description"]').setAttribute("content", desc);
    document.querySelector('meta[property="og:title"]').setAttribute("content", pageTitle);
    document.querySelector('meta[property="og:description"]').setAttribute("content", desc);
    document.querySelector('meta[property="og:image"]').setAttribute("content", posterUrl);
    document.querySelector('meta[property="og:url"]').setAttribute("content", window.location.href);
    document.querySelector('meta[name="twitter:title"]').setAttribute("content", pageTitle);
    document.querySelector('meta[name="twitter:description"]').setAttribute("content", desc);
    document.querySelector('meta[name="twitter:image"]').setAttribute("content", posterUrl);

    loadVideos(movieId);
  })
  .catch((err) => {
    console.error(err);
  });


let favouritesListId = null;
let isFavourited = false;

async function resolveUserId() {
  if (user?.id) return user.id;
  if (!user) return null;
  const res = await fetch("https://api.24frames.app/profile", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
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
    credentials: "include",
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
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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

if (user) {
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

    const recommendBtn = document.getElementById("recommendBtn");
    if (recommendBtn) recommendBtn.style.display = "inline-block";
  });
}

const addToListBtn = document.getElementById("addToListBtn");
const listPicker = document.getElementById("listPicker");

addToListBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = listPicker.classList.contains("open");
  if (isOpen) { listPicker.classList.remove("open"); return; }

  listPicker.innerHTML = allLists.map((list) => {
    const inList = (list.movie_ids || []).includes(movieId);
    return `<button class="list-picker-item${inList ? " in-list" : ""}" data-list-id="${list.ID}" data-in-list="${inList}">
      ${inList ? "✓ " : ""}${escapeHtml(list.name)}
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
          credentials: "include",
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
  if (!user || !favouritesListId) return;
  const btn = document.getElementById("favouriteBtn");
  btn.disabled = true;

  const method = isFavourited ? "DELETE" : "POST";
  try {
    const res = await fetch(
      `https://api.24frames.app/lists/${favouritesListId}/movies/${movieId}`,
      { method, credentials: "include" }
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

// ── Recommend feature ──────────────────────────────────────────────────────
let recommendFriends = null;
let selectedFriendId = null;
let currentMovieTitle = "";
let currentMoviePoster = "";

document.getElementById("recommendBtn")?.addEventListener("click", openRecommendModal);
document.getElementById("recommendClose")?.addEventListener("click", closeRecommendModal);
document.getElementById("recommendModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("recommendModal")) closeRecommendModal();
});

function openRecommendModal() {
  selectedFriendId = null;
  document.getElementById("recommendSend").disabled = true;
  document.getElementById("recommendMsg").value = "";
  document.getElementById("recommendFeedback").textContent = "";
  document.getElementById("recommendModal").style.display = "flex";
  updateShareLinks();

  if (recommendFriends !== null) {
    renderFriendsList(recommendFriends);
    return;
  }

  const listEl = document.getElementById("recommendFriendsList");
  listEl.innerHTML = "<p class='rec-loading'>Loading friends…</p>";

  resolveUserId().then((userId) => {
    if (!userId) return;
    fetch(`https://api.24frames.app/users/${userId}/friends`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        recommendFriends = data.users || [];
        renderFriendsList(recommendFriends);
      })
      .catch(() => {
        listEl.innerHTML = "<p class='rec-loading'>Failed to load friends.</p>";
      });
  });
}

function closeRecommendModal() {
  document.getElementById("recommendModal").style.display = "none";
}

function renderFriendsList(friends) {
  const listEl = document.getElementById("recommendFriendsList");
  if (!friends.length) {
    listEl.innerHTML = "<p class='rec-loading'>You have no mutual friends yet. Follow each other to become friends!</p>";
    return;
  }
  listEl.innerHTML = friends
    .map((f) => {
      const display = escapeHtml(f.name || f.username || "User");
      const handle = f.username ? `@${escapeHtml(f.username)}` : "";
      return `<button class="rec-friend-chip" data-id="${f.ID}">
        <span class="rec-friend-name">${display}</span>
        ${handle ? `<span class="rec-friend-handle">${handle}</span>` : ""}
      </button>`;
    })
    .join("");

  listEl.querySelectorAll(".rec-friend-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      listEl.querySelectorAll(".rec-friend-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedFriendId = parseInt(chip.dataset.id);
      document.getElementById("recommendSend").disabled = false;
    });
  });
}

document.getElementById("recommendSend")?.addEventListener("click", async () => {
  if (!selectedFriendId) return;
  const msg = document.getElementById("recommendMsg").value.trim();
  const sendBtn = document.getElementById("recommendSend");
  const feedback = document.getElementById("recommendFeedback");
  sendBtn.disabled = true;
  feedback.textContent = "";

  try {
    const res = await fetch(`https://api.24frames.app/movie/${movieId}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        to_user_id: selectedFriendId,
        message: msg,
        movie_title: currentMovieTitle,
        movie_poster: currentMoviePoster,
      }),
    });
    if (!res.ok) throw new Error();
    feedback.textContent = "Recommendation sent!";
    feedback.style.color = "#6fcf97";
    setTimeout(closeRecommendModal, 1200);
  } catch {
    feedback.textContent = "Failed to send. Try again.";
    feedback.style.color = "#e74c3c";
    sendBtn.disabled = false;
  }
});

// ── External share links ──────────────────────────────────────────────────
function updateShareLinks() {
  const movieUrl = `https://24frames.app/movie.html?id=${movieId}`;
  const senderName = user?.name || user?.username || "Someone";
  const shareText = `${senderName} thinks you should see ${currentMovieTitle || "this movie"} on 24Frames!`;
  const emailBody = `${shareText}\n\nWatch on 24Frames: ${movieUrl}\n\nNew to 24Frames? Sign up at https://24frames.app/register.html`;

  const waEl = document.getElementById("shareWhatsapp");
  const mailEl = document.getElementById("shareEmail");
  if (waEl) waEl.href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${movieUrl}`)}`;
  if (mailEl) mailEl.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(emailBody)}`;
}

document.getElementById("shareCopy")?.addEventListener("click", () => {
  const movieUrl = `https://24frames.app/movie.html?id=${movieId}`;
  navigator.clipboard.writeText(movieUrl).then(() => {
    const btn = document.getElementById("shareCopy");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy link"; }, 1800);
  });
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
    if (tab !== "videos" && !loadedTabs.has(tab)) {
      loadedTabs.add(tab);
      loadPosts(tab);
    }
  });
});

if (!user) {
  document.querySelectorAll(".post-form").forEach((f) => (f.style.display = "none"));
  ["reviews", "theories", "funfacts"].forEach((tab) => {
    const section = document.getElementById(tab + "Section");
    const prompt = document.createElement("p");
    prompt.className = "login-to-post";
    prompt.innerHTML = `<a href="login.html">Log in</a> to post`;
    section.prepend(prompt);
  });
}

async function loadPosts(tab) {
  const listEl = document.getElementById(listIds[tab]);
  listEl.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const res = await fetch(
      `https://api.24frames.app/movie/${movieId}/posts?type=${typeMap[tab]}`,
      { credentials: "include" }
    );
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
    .map((p) => {
      const display = escapeHtml(p.name || p.username || "User");
      const count = p.like_count || 0;
      const likedClass = p.liked_by_me ? " liked" : "";
      const replyCount = p.reply_count || 0;
      const replyBadge = replyCount > 0 ? `<span class="reply-count-badge">${replyCount}</span>` : "";
      return `
        <div class="review-card" data-post-id="${p.ID}">
          <div class="post-header">
            <a class="post-author-link" href="profile.html?id=${p.user_id}">
              <img class="post-avatar" src="images/claqueta%20profile.png" alt="" />
            </a>
            <div class="post-meta">
              <a class="post-author-link post-name" href="profile.html?id=${p.user_id}">${display}</a>
              <span class="post-handle">@${escapeHtml(p.username)} · ${timeAgo(p.created_at)}</span>
            </div>
          </div>
          <p class="review-excerpt post-body-clickable" data-post-id="${p.ID}">${escapeHtml(p.body)}</p>
          <div class="post-footer">
            ${user ? `<button class="like-btn${likedClass}" data-post-id="${p.ID}" data-liked="${p.liked_by_me ? "1" : "0"}" data-count="${count}">♥ <span class="like-count">${count}</span></button>` : `<span class="like-count-static">♥ ${count}</span>`}
            <button class="share-btn" data-post-id="${p.ID}" data-tab="${tab}" title="Share" aria-label="Share post"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
            <button class="replies-toggle" data-post-id="${p.ID}" data-count="${replyCount}" title="Replies" aria-label="Toggle replies"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${replyBadge}</button>
          </div>
          <div class="replies-section" id="replies-${p.ID}" style="display:none">
            <div class="replies-list" id="replies-list-${p.ID}"></div>
            ${user
              ? `<div class="reply-form">
                <textarea class="reply-input" placeholder="Write a reply…" maxlength="500" rows="2"></textarea>
                <button class="reply-submit" data-post-id="${p.ID}">Reply</button>
              </div>`
              : `<p class="reply-login"><a href="login.html">Log in</a> to reply</p>`
            }
          </div>
        </div>
      `;
    })
    .join("");
}

const loadedReplies = new Set();

async function fetchReplies(postId) {
  const listEl = document.getElementById(`replies-list-${postId}`);
  if (!listEl) return;
  try {
    const res = await fetch(`https://api.24frames.app/posts/${postId}/replies`, {
      credentials: "include",
    });
    const data = await res.json();
    renderReplies(data.replies || [], listEl);
  } catch {
    listEl.innerHTML = '<p class="muted">Failed to load replies.</p>';
  }
}

function renderReplies(replies, container) {
  if (!replies.length) {
    container.innerHTML = '<p class="muted reply-empty">No replies yet.</p>';
    return;
  }
  container.innerHTML = replies
    .map((r) => {
      const display = escapeHtml(r.name || r.username || "User");
      return `
        <div class="reply-card">
          <div class="reply-header">
            <a class="reply-author-link" href="profile.html?id=${r.user_id}">
              <img class="reply-avatar" src="images/claqueta%20profile.png" alt="" />
            </a>
            <div class="reply-meta">
              <a class="reply-author-link reply-name" href="profile.html?id=${r.user_id}">${display}</a>
              <span class="reply-handle">@${escapeHtml(r.username)} · ${timeAgo(r.created_at)}</span>
            </div>
          </div>
          <p class="reply-body">${escapeHtml(r.body)}</p>
        </div>
      `;
    })
    .join("");
}

function toggleReplies(postId) {
  const section = document.getElementById(`replies-${postId}`);
  if (!section) return;
  const isHidden = section.style.display === "none";
  section.style.display = isHidden ? "" : "none";
  if (isHidden && !loadedReplies.has(postId)) {
    loadedReplies.add(postId);
    const listEl = document.getElementById(`replies-list-${postId}`);
    if (listEl) listEl.innerHTML = '<p class="muted">Loading…</p>';
    fetchReplies(postId);
  }
}

function initLikeHandlers() {
  ["reviewsList", "theoriesList", "funfactsList"].forEach((listId) => {
    document.getElementById(listId)?.addEventListener("click", async (e) => {
      const shareBtn = e.target.closest(".share-btn");
      if (shareBtn) {
        const postId = shareBtn.dataset.postId;
        const tab = shareBtn.dataset.tab;
        const url = `https://24frames.app/movie.html?id=${movieId}&post=${postId}&tab=${tab}`;
        if (navigator.share) {
          navigator.share({ url, title: document.title }).catch(() => {});
        } else {
          try {
            await navigator.clipboard.writeText(url);
            const orig = shareBtn.innerHTML;
            shareBtn.innerHTML = "✓";
            setTimeout(() => { shareBtn.innerHTML = orig; }, 2000);
          } catch {
            prompt("Copy this link:", url);
          }
        }
        return;
      }

      const repliesToggle = e.target.closest(".replies-toggle");
      if (repliesToggle) {
        toggleReplies(repliesToggle.dataset.postId);
        return;
      }

      const bodyClick = e.target.closest(".post-body-clickable");
      if (bodyClick) {
        toggleReplies(bodyClick.dataset.postId);
        return;
      }

      const replySubmit = e.target.closest(".reply-submit");
      if (replySubmit && user) {
        const postId = replySubmit.dataset.postId;
        const section = document.getElementById(`replies-${postId}`);
        const textarea = section?.querySelector(".reply-input");
        if (!textarea) return;
        const content = textarea.value.trim();
        if (!content) return;

        replySubmit.disabled = true;
        try {
          const res = await fetch(`https://api.24frames.app/posts/${postId}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to reply");
          }
          textarea.value = "";
          loadedReplies.delete(postId);
          const listEl = document.getElementById(`replies-list-${postId}`);
          if (listEl) listEl.innerHTML = '<p class="muted">Loading…</p>';
          loadedReplies.add(postId);
          fetchReplies(postId);

          const toggleBtn = document.querySelector(`.replies-toggle[data-post-id="${postId}"]`);
          if (toggleBtn) {
            const newCount = parseInt(toggleBtn.dataset.count || "0") + 1;
            toggleBtn.dataset.count = newCount;
            let badge = toggleBtn.querySelector(".reply-count-badge");
            if (!badge) {
              badge = document.createElement("span");
              badge.className = "reply-count-badge";
              toggleBtn.appendChild(badge);
            }
            badge.textContent = newCount;
          }
        } catch (err) {
          alert(err.message || "Failed to reply. Please try again.");
        } finally {
          replySubmit.disabled = false;
        }
        return;
      }

      const btn = e.target.closest(".like-btn");
      if (!btn || !user) return;

      const postId = btn.dataset.postId;
      const wasLiked = btn.dataset.liked === "1";
      const prevCount = parseInt(btn.dataset.count) || 0;
      const countEl = btn.querySelector(".like-count");

      const newLiked = !wasLiked;
      const newCount = newLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
      btn.classList.toggle("liked", newLiked);
      btn.dataset.liked = newLiked ? "1" : "0";
      btn.dataset.count = newCount;
      countEl.textContent = newCount;

      try {
        const res = await fetch(`https://api.24frames.app/posts/${postId}/like`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        btn.dataset.count = data.like_count;
        countEl.textContent = data.like_count;
        btn.dataset.liked = data.liked ? "1" : "0";
        btn.classList.toggle("liked", data.liked);
      } catch {
        btn.classList.toggle("liked", wasLiked);
        btn.dataset.liked = wasLiked ? "1" : "0";
        btn.dataset.count = prevCount;
        countEl.textContent = prevCount;
      }
    });
  });
}

initLikeHandlers();

(async () => {
  const params = new URLSearchParams(location.search);
  const targetPostId = params.get("post");
  const targetTab = params.get("tab");
  if (!targetPostId || !["reviews", "theories", "funfacts"].includes(targetTab)) return;

  tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === targetTab));
  tabSections.forEach((s) => (s.style.display = "none"));
  document.getElementById(targetTab + "Section").style.display = "";

  if (!loadedTabs.has(targetTab)) {
    loadedTabs.add(targetTab);
    await loadPosts(targetTab);
  }

  const el = document.querySelector(`[data-post-id="${CSS.escape(targetPostId)}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("post-highlighted");
    setTimeout(() => el.classList.remove("post-highlighted"), 2500);
  }
})();

async function submitPost(e, tab, endpoint) {
  e.preventDefault();
  const content = e.target.content.value.trim();
  if (!content) return;
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch(`https://api.24frames.app/movie/${movieId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to post");
    }
    e.target.reset();
    loadedTabs.delete(tab);
    loadPosts(tab);
  } catch (err) {
    alert(err.message || "Failed to post. Please try again.");
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
    credentials: user ? "include" : "omit",
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
          <h3>${escapeHtml(video.name || "Untitled video")}</h3>
          <iframe
            src="${escapeHtml(video.url)}"
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
      videosSection.innerHTML = "<p>Error loading videos. Please try again later.</p>";
    });
}
