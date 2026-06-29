const page = document.body.dataset.page;
const basePath = document.body.dataset.base || "";
const navItems = [
  ["Home", "index.html", "home"],
  ["Discover", "discover.html", "discover"],
  ["Catalog", "catalog.html", "catalog"],
  ["Sync Licensing", "sync.html", "sync"],
  ["About", "about.html", "about"]
];

const header = document.querySelector("[data-header]");
if (header) {
  header.innerHTML = `
    <div class="shell nav-wrap">
      <a class="brand" href="${basePath}index.html"><span class="brand-mark">JMT</span><span>JMT MUSIC</span></a>
      <button class="menu-button" type="button" aria-label="Open navigation"><span></span></button>
      <nav class="nav-links" aria-label="Primary">
        ${navItems.map(([label, href, id]) => `<a href="${basePath}${href}" class="${page === id ? "active" : ""}">${label}</a>`).join("")}
        <a class="nav-cta ${page === "contact" ? "active" : ""}" href="${basePath}contact.html">Contact</a>
      </nav>
    </div>`;
  const menu = header.querySelector(".menu-button");
  const links = header.querySelector(".nav-links");
  menu.addEventListener("click", () => {
    links.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(links.classList.contains("open")));
  });
  addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 20), { passive: true });
}

const footer = document.querySelector("[data-footer]");
if (footer) {
  footer.innerHTML = `
    <div class="shell">
      <div class="footer-top">
        <p class="footer-title">Original sound for artists, stories, and screens.</p>
        <div class="footer-links">
          <a href="#" aria-label="Instagram placeholder">Instagram</a>
          <span>BeatStars coming soon</span>
          <a href="mailto:hello@jmtmusic.studio">hello@jmtmusic.studio</a>
        </div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} JMT Music. All rights reserved.</span><span>Music by Jonathan Tripp</span></div>
    </div>`;
}

function initializeCatalog(catalog) {
window.JMT_TRACKS = [...catalog.tracks].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
window.JMT_CATEGORIES = catalog.genres;

const floatingCoverLayer = document.querySelector("[data-floating-covers]");
if (floatingCoverLayer && window.JMT_TRACKS) {
  floatingCoverLayer.innerHTML = window.JMT_TRACKS.slice(0, 5).map((track, index) => `
    <div class="floating-cover" data-depth="${0.28 + index * 0.07}">
      ${artworkMarkup(track, false)}
    </div>`).join("");

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let pointerX = 0;
    let pointerY = 0;
    let frame;
    const covers = [...floatingCoverLayer.querySelectorAll(".floating-cover")];
    const updateParallax = () => {
      covers.forEach(cover => {
        const depth = Number(cover.dataset.depth);
        cover.style.setProperty("--shift-x", `${pointerX * depth}px`);
        cover.style.setProperty("--shift-y", `${pointerY * depth}px`);
      });
      frame = null;
    };
    document.querySelector(".hero").addEventListener("pointermove", event => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - .5) * 22;
      pointerY = ((event.clientY - rect.top) / rect.height - .5) * 16;
      if (!frame) frame = requestAnimationFrame(updateParallax);
    }, { passive: true });
  }
}

function artworkMarkup(track, lazy = true) {
  const image = track.coverImage
    ? `<img src="${basePath}${track.coverImage}" alt="${track.title} artwork" ${lazy ? 'loading="lazy"' : ""} decoding="async">`
    : "";
  return `<div class="artwork artwork-${track.art || 1}">${image}<span class="art-label">${track.title}</span></div>`;
}

function releaseTags(track) {
  return (track.tags || [])
    .filter(Boolean)
    .map(value => `<span class="tag">${value}</span>`)
    .join("");
}

function validBeatStarsUrl(value) {
  if (!value || typeof value !== "string" || value.trim() === "" || value.trim() === "#") return null;
  try {
    const url = new URL(value);
    const isBeatStars = url.hostname === "beatstars.com" || url.hostname.endsWith(".beatstars.com");
    const isTrackPage = /^\/beat\/[^/]+/i.test(url.pathname);
    return url.protocol === "https:" && isBeatStars && isTrackPage ? url.href : null;
  } catch {
    return null;
  }
}

function beatstarsButton(track, className = "button button-small button-primary") {
  const url = validBeatStarsUrl(track.beatstarsUrl);
  if (!url) {
    return `<span class="${className} is-disabled" aria-disabled="true">BeatStars Coming Soon</span>`;
  }
  return `<a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="View ${track.title} on BeatStars">View on BeatStars</a>`;
}

function validAudioUrl(value) {
  if (!value || typeof value !== "string") return null;
  const path = value.trim();
  return /^\/audio\/[^/]+\.(mp3|m4a|aac|ogg|wav)$/i.test(path) ? path : null;
}

function audioButton(track, className = "button button-small") {
  const url = validAudioUrl(track.audioUrl);
  if (!url) {
    return `<span class="${className} is-disabled" aria-disabled="true">Audio Coming Soon</span>`;
  }
  return `<button class="${className} play-button" type="button" data-audio-url="${url}" data-default-label="▶ Play Preview" aria-label="Play ${track.title} preview">▶ Play Preview</button>`;
}

function releaseCard(track) {
  const genreName = window.JMT_CATEGORIES.find(category => category.id === track.genre)?.name || track.genre;
  return `
    <article class="release-card catalog-release-card" data-category="${track.genre}">
      ${artworkMarkup(track)}
      <div class="card-body">
        <p class="release-genre">${genreName || "Instrumental"}</p>
        <h3 class="card-title">${track.title}</h3>
        <p class="release-bpm">${track.bpm} BPM${track.key ? ` <span>•</span> ${track.key}` : ""}</p>
        <p class="release-description">${track.shortDescription || ""}</p>
        <div class="track-tags">${releaseTags(track)}</div>
        <div class="track-actions">
          ${audioButton(track)}
          ${beatstarsButton(track)}
        </div>
      </div>
    </article>`;
}

function recentReleaseCard(track) {
  const genreName = window.JMT_CATEGORIES.find(category => category.id === track.genre)?.name || track.genre;
  return `
    <article class="release-card recent-release-card">
      ${artworkMarkup(track)}
      <div class="card-body">
        <p class="release-genre">${genreName || "Instrumental"}</p>
        <h3 class="card-title">${track.title}</h3>
        <p class="card-meta">${track.shortDescription || ""}</p>
        <div class="track-actions">
          ${audioButton(track)}
          ${beatstarsButton(track)}
        </div>
      </div>
    </article>`;
}

function trackCard(track) {
  return `
    <article class="track-card" data-category="${track.genre}">
      ${artworkMarkup(track)}
      <div class="track-info">
        <div>
          <h3 class="card-title">${track.title}</h3>
          <div class="track-tags">${releaseTags(track)}</div>
        </div>
        <div class="track-actions">
          ${audioButton(track)}
          ${beatstarsButton(track, "button button-small")}
        </div>
      </div>
    </article>`;
}

const newestRelease = document.querySelector("[data-newest-release]");
if (newestRelease && window.JMT_TRACKS) {
  const track = window.JMT_TRACKS.find(item => item.featured) || window.JMT_TRACKS[0];
  newestRelease.innerHTML = `
    <article class="featured-release">
      <div class="featured-art">${artworkMarkup(track, false)}</div>
      <div class="featured-copy">
        <p class="eyebrow">${window.JMT_CATEGORIES.find(category => category.id === track.genre)?.name || track.genre || "New instrumental"}</p>
        <h3>${track.title}</h3>
        ${track.shortDescription ? `<p class="featured-description">${track.shortDescription}</p>` : ""}
        <div class="featured-meta">${releaseTags(track)}</div>
        <div class="actions">
          ${beatstarsButton(track, "button button-primary")}
          ${audioButton(track, "button")}
        </div>
      </div>
    </article>`;
}

const heroRelease = document.querySelector("[data-hero-release]");
const heroCover = document.querySelector("[data-hero-cover]");
if (heroRelease && heroCover && window.JMT_TRACKS) {
  const track = window.JMT_TRACKS.find(item => item.featured) || window.JMT_TRACKS[0];
  heroCover.innerHTML = artworkMarkup(track, false);
  heroRelease.innerHTML = `
    <p class="hero-release-label">Newest release</p>
    <h2>${track.title}</h2>
    <p class="hero-release-meta">${window.JMT_CATEGORIES.find(category => category.id === track.genre)?.name || track.genre} <span>•</span> ${track.bpm} BPM</p>
    <p class="hero-release-description">${track.shortDescription || ""}</p>
    <div class="actions">
      ${audioButton(track, "button button-primary")}
      ${beatstarsButton(track, "button")}
    </div>`;
}

const categoryRails = document.querySelector("[data-category-rails]");
if (categoryRails && window.JMT_CATEGORIES) {
  categoryRails.innerHTML = window.JMT_CATEGORIES.map((category, index) => {
    const tracks = window.JMT_TRACKS.filter(track => track.genre === category.id).slice(0, 4);
    return `
      <section class="catalog-rail">
        <div class="rail-heading">
          <div><span>0${index + 1}</span><h3>${category.name}</h3></div>
          <a class="text-link" href="catalog.html?filter=${category.id}">View category</a>
        </div>
        <div class="release-grid">${tracks.map(releaseCard).join("")}</div>
      </section>`;
  }).join("");
}

const recentReleases = document.querySelector("[data-recent-releases]");
if (recentReleases && window.JMT_TRACKS) {
  recentReleases.innerHTML = window.JMT_TRACKS.filter(track => track.featured).slice(0, 6).map(recentReleaseCard).join("");
}

const genreCards = document.querySelector("[data-genre-cards]");
if (genreCards && window.JMT_CATEGORIES) {
  genreCards.innerHTML = window.JMT_CATEGORIES.map(category => {
    const featuredTrack = window.JMT_TRACKS.find(track => track.genre === category.id);
    return `
      <article class="genre-card">
        <div class="genre-card-art">${featuredTrack ? artworkMarkup(featuredTrack) : ""}</div>
        <div class="genre-card-copy">
          <p class="eyebrow">Genre</p>
          <h3>${category.name}</h3>
          <p>${category.description}</p>
          <a class="button button-small" href="${category.path}">Explore</a>
        </div>
      </article>`;
  }).join("");
}

const genrePageGrid = document.querySelector("[data-genre-page-grid]");
if (genrePageGrid && window.JMT_TRACKS) {
  const category = document.body.dataset.category;
  genrePageGrid.innerHTML = window.JMT_TRACKS
    .filter(track => track.genre === category)
    .map(releaseCard)
    .join("");
}

const catalogSections = document.querySelector("[data-catalog-sections]");
if (catalogSections && window.JMT_CATEGORIES) {
  catalogSections.innerHTML = window.JMT_CATEGORIES.map(category => `
    <section class="catalog-section" data-catalog-category="${category.id}">
      <h2 class="catalog-title">${category.name}</h2>
      <p class="catalog-description">${category.description}</p>
      <div class="release-grid catalog-release-grid">${window.JMT_TRACKS.filter(track => track.genre === category.id).map(releaseCard).join("")}</div>
    </section>`).join("");
}

document.querySelectorAll("[data-track-grid]").forEach(grid => {
  const category = grid.dataset.trackGrid;
  const tracks = category === "all" ? window.JMT_TRACKS : window.JMT_TRACKS.filter(track => track.genre === category);
  grid.innerHTML = tracks.map(trackCard).join("");
});

let audioPlayer = document.querySelector("[data-audio-player]");
if (!audioPlayer) {
  audioPlayer = document.createElement("audio");
  audioPlayer.dataset.audioPlayer = "";
  audioPlayer.preload = "none";
  audioPlayer.hidden = true;
  document.body.append(audioPlayer);
}

let activeAudioButton = null;
const resetAudioButtons = () => {
  document.querySelectorAll(".play-button").forEach(item => {
    item.classList.remove("playing");
    item.textContent = item.dataset.defaultLabel || "▶ Play Preview";
  });
};

audioPlayer.addEventListener("ended", () => {
  resetAudioButtons();
  activeAudioButton = null;
});

audioPlayer.addEventListener("error", () => {
  if (activeAudioButton) {
    activeAudioButton.classList.remove("playing");
    activeAudioButton.classList.add("is-disabled");
    activeAudioButton.disabled = true;
    activeAudioButton.textContent = "Audio Coming Soon";
  }
  activeAudioButton = null;
});

document.querySelectorAll(".play-button").forEach(button => {
  button.addEventListener("click", () => {
    if (activeAudioButton === button && !audioPlayer.paused) {
      audioPlayer.pause();
      resetAudioButtons();
      activeAudioButton = null;
      return;
    }

    audioPlayer.pause();
    resetAudioButtons();
    activeAudioButton = button;
    audioPlayer.src = button.dataset.audioUrl;
    button.classList.add("playing");
    button.textContent = "■ Stop Preview";
    audioPlayer.play().catch(() => {
      button.classList.remove("playing");
      button.classList.add("is-disabled");
      button.disabled = true;
      button.textContent = "Audio Coming Soon";
      activeAudioButton = null;
    });
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const value = button.dataset.filter;
    document.querySelectorAll(".track-card, .release-card").forEach(card => {
      card.style.display = value === "all" || card.dataset.category === value ? "" : "none";
    });
    document.querySelectorAll("[data-catalog-category]").forEach(section => {
      section.style.display = value === "all" || section.dataset.catalogCategory === value ? "" : "none";
    });
  });
});

const requestedFilter = new URLSearchParams(location.search).get("filter");
if (requestedFilter) {
  const filterButton = document.querySelector(`[data-filter="${requestedFilter}"]`);
  if (filterButton) filterButton.click();
}
}

addEventListener("jmt:catalog-ready", event => initializeCatalog(event.detail), { once: true });
if (window.JMT_CATALOG) initializeCatalog(window.JMT_CATALOG);

const form = document.querySelector("[data-contact-form]");
if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    form.reset();
    document.querySelector(".form-success").classList.add("visible");
  });
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -35px" });

  document.querySelectorAll("main > .section, .catalog-rail, .sync-banner").forEach(element => {
    element.classList.add("reveal");
    revealObserver.observe(element);
  });
}
