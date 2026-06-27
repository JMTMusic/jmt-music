const page = document.body.dataset.page;
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
      <a class="brand" href="index.html"><span class="brand-mark">JMT</span><span>JMT MUSIC</span></a>
      <button class="menu-button" type="button" aria-label="Open navigation"><span></span></button>
      <nav class="nav-links" aria-label="Primary">
        ${navItems.map(([label, href, id]) => `<a href="${href}" class="${page === id ? "active" : ""}">${label}</a>`).join("")}
        <a class="nav-cta ${page === "contact" ? "active" : ""}" href="contact.html">Contact</a>
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
          <a href="#" aria-label="BeatStars placeholder">BeatStars</a>
          <a href="mailto:hello@jmtmusic.studio">hello@jmtmusic.studio</a>
        </div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} JMT Music. All rights reserved.</span><span>Music by Jonathan Tripp</span></div>
    </div>`;
}

const floatingCoverLayer = document.querySelector("[data-floating-covers]");
if (floatingCoverLayer && window.JMT_TRACKS) {
  floatingCoverLayer.innerHTML = window.JMT_TRACKS.slice(0, 6).map(track => `
    <div class="floating-cover" data-depth="${0.25 + track.art * 0.08}">
      <div class="artwork artwork-${track.art}"><span class="art-label">${track.title}</span></div>
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

function trackCard(track) {
  return `
    <article class="track-card" data-category="${track.category}">
      <div class="artwork artwork-${track.art}"><span class="art-label">${track.title}</span></div>
      <div class="track-info">
        <div>
          <h3 class="card-title">${track.title}</h3>
          <div class="track-tags">
            <span class="tag">${track.mood}</span><span class="tag">${track.genre}</span>
            <span class="tag">${track.bpm} BPM</span><span class="tag">${track.key}</span>
          </div>
        </div>
        <div class="track-actions">
          <button class="button button-small play-button" type="button">▶ Play preview</button>
          <a class="button button-small" href="#" aria-label="License ${track.title} on BeatStars">License</a>
        </div>
      </div>
    </article>`;
}

document.querySelectorAll("[data-track-grid]").forEach(grid => {
  const category = grid.dataset.trackGrid;
  const tracks = category === "all" ? window.JMT_TRACKS : window.JMT_TRACKS.filter(track => track.category === category);
  grid.innerHTML = tracks.map(trackCard).join("");
});

document.querySelectorAll(".play-button").forEach(button => {
  button.addEventListener("click", () => {
    const wasPlaying = button.classList.contains("playing");
    document.querySelectorAll(".play-button").forEach(item => {
      item.classList.remove("playing");
      item.textContent = "▶ Play preview";
    });
    if (!wasPlaying) {
      button.classList.add("playing");
      button.textContent = "■ Stop preview";
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const value = button.dataset.filter;
    document.querySelectorAll(".track-card").forEach(card => {
      card.style.display = value === "all" || card.dataset.category === value ? "" : "none";
    });
  });
});

const requestedFilter = new URLSearchParams(location.search).get("filter");
if (requestedFilter) {
  const filterButton = document.querySelector(`[data-filter="${requestedFilter}"]`);
  if (filterButton) filterButton.click();
}

const form = document.querySelector("[data-contact-form]");
if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    form.reset();
    document.querySelector(".form-success").classList.add("visible");
  });
}
