/* ============ YOUTUBE PLAYLIST THUMBNAILS (real YouTube images, progressive enhancement) ============ */
async function fetchPlaylistThumbnail(url) {
  const cacheKey = `yt-thumb:${url}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached === 'none' ? null : cached;

  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`);
    const data = await res.json();
    const thumb = data && data.thumbnail_url ? data.thumbnail_url : null;
    sessionStorage.setItem(cacheKey, thumb || 'none');
    return thumb;
  } catch (err) {
    return null;
  }
}

function enhancePlaylistThumbnails(playlists, grid) {
  playlists.forEach(async (p) => {
    const thumbUrl = await fetchPlaylistThumbnail(p.url);
    if (!thumbUrl) return;
    const thumbEl = grid.querySelector(`.playlist-thumb[data-slug="${p.slug}"]`);
    if (!thumbEl) return;
    const img = document.createElement('img');
    img.className = 'playlist-thumb-img';
    img.src = thumbUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    thumbEl.prepend(img);
    thumbEl.classList.add('has-photo');
  });
}

/* ============ YOUTUBE PLAYLISTS PAGE ============ */
async function renderPlaylists() {
  const grid = document.getElementById('playlist-grid');
  if (!grid) return;

  try {
    const res = await fetch('assets/data/playlists.json');
    const playlists = await res.json();

    playlists.sort((a, b) => (b.featured - a.featured) || (b.videoCount - a.videoCount));

    grid.innerHTML = playlists.map((p) => `
      <article class="playlist-card card card-hover reveal">
        <a class="playlist-thumb ${p.categoryClass}" data-slug="${p.slug}" href="${p.url}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${p.title} on YouTube">
          ${p.featured ? '<span class="playlist-featured-tag">Featured</span>' : ''}
          <span class="playlist-video-count">${p.videoCount} Video${p.videoCount > 1 ? 's' : ''}</span>
          <div class="play-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </a>
        <div class="playlist-body">
          <span class="playlist-cat">${p.category}</span>
          <h3>${p.title}</h3>
          <p>${p.description}</p>
          <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Watch on YouTube</a>
        </div>
      </article>
    `).join('');

    document.dispatchEvent(new CustomEvent('playlists:rendered'));
    if (typeof initReveal === 'function') initReveal();
    enhancePlaylistThumbnails(playlists, grid);
  } catch (err) {
    grid.innerHTML = '<p class="lede">Playlists could not be loaded right now. Please visit the YouTube channel directly.</p>';
    console.error(err);
  }
}

/* ============ HOME: LATEST PLAYLISTS PREVIEW ============ */
async function renderFeaturedPlaylists(limit = 3) {
  const grid = document.getElementById('featured-playlist-grid');
  if (!grid) return;

  try {
    const res = await fetch('assets/data/playlists.json');
    const playlists = await res.json();
    playlists.sort((a, b) => (b.featured - a.featured) || (b.videoCount - a.videoCount));
    const featured = playlists.slice(0, limit);

    grid.innerHTML = featured.map((p) => `
      <article class="playlist-card card card-hover reveal">
        <a class="playlist-thumb ${p.categoryClass}" data-slug="${p.slug}" href="${p.url}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${p.title} on YouTube">
          <span class="playlist-video-count">${p.videoCount} Video${p.videoCount > 1 ? 's' : ''}</span>
          <div class="play-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </a>
        <div class="playlist-body">
          <span class="playlist-cat">${p.category}</span>
          <h3>${p.title}</h3>
          <p>${p.description}</p>
        </div>
      </article>
    `).join('');
    if (typeof initReveal === 'function') initReveal();
    enhancePlaylistThumbnails(featured, grid);
  } catch (err) {
    console.error(err);
  }
}

/* ============ PUBLICATIONS PAGE ============ */
async function renderPublications() {
  const grid = document.getElementById('publications-grid');
  const emptyState = document.getElementById('publications-empty');
  if (!grid) return;

  try {
    const res = await fetch('assets/data/publications.json');
    const pubs = await res.json();

    if (!pubs.length) {
      if (emptyState) emptyState.hidden = false;
      grid.hidden = true;
      return;
    }

    grid.hidden = false;
    if (emptyState) emptyState.hidden = true;

    grid.innerHTML = pubs.map((p) => `
      <article class="pub-card card reveal">
        <div class="pub-meta">
          <span>${p.venue}</span> · <span>${p.year}</span>
        </div>
        <h3>${p.title}</h3>
        <p class="pub-abstract">${p.abstract}</p>
        <div class="pub-actions">
          ${p.pdfUrl ? `<a class="btn btn-outline btn-sm" href="${p.pdfUrl}" target="_blank" rel="noopener noreferrer">Download PDF</a>` : ''}
          ${p.doi ? `<a class="btn btn-ghost btn-sm" href="${p.doi}" target="_blank" rel="noopener noreferrer">DOI</a>` : ''}
        </div>
      </article>
    `).join('');
    if (typeof initReveal === 'function') initReveal();
  } catch (err) {
    console.error(err);
  }
}

/* ============ PROJECTS FILTER ============ */
function initProjectFilter() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const bar = document.querySelector('.filter-bar');
  if (!bar) return;
  const pills = bar.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('#projects-grid .project-card');

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter;
      cards.forEach((card) => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
      });
    });
  });
}

/* ============ CONTACT FORM (mailto fallback) ============ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim() || 'Portfolio contact form';
    const message = form.message.value.trim();

    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:omarsanad162712@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderPlaylists();
  renderFeaturedPlaylists();
  renderPublications();
  initProjectFilter();
  initContactForm();
});
