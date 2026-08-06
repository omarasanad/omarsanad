const CERT_CATEGORIES = [
  {
    slug: 'smart-buildings-knx',
    title: 'Smart Buildings & KNX',
    description: 'Building automation and smart home integration expertise, certified by the KNX Association.',
  },
  {
    slug: 'professional-programs-internships',
    title: 'Professional Programs & Internships',
    description: 'Hands-on industry experience gained through structured internship and development programs.',
  },
  {
    slug: 'online-training',
    title: 'Online Training',
    description: 'Self-paced technical training completed through structured online learning portals.',
  },
  {
    slug: 'industrial-automation',
    title: 'Industrial Automation',
    description: 'Practical training in PLC programming, motor & drive control, and classic industrial control systems.',
  },
  {
    slug: 'professional-development',
    title: 'Professional Development',
    description: 'Broader professional credentials and soft-skill training complementing my technical expertise.',
  },
];

function certIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>`;
}

function certCardHTML(cert) {
  const canView = Boolean(cert.pdfUrl);
  return `
    <article class="cert-card card card-hover reveal"
      data-slug="${cert.slug}"
      data-category="${cert.category}"
      data-search="${(cert.title + ' ' + cert.org + ' ' + cert.skills.join(' ')).toLowerCase()}">
      <div class="cert-card-head">
        <span class="org-badge" style="background:${cert.orgColor};">${cert.orgShort}</span>
        <div>
          <h3>${cert.title}</h3>
          <p class="cert-issuer">${cert.org}</p>
        </div>
      </div>
      <span class="cert-date">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18" stroke-linecap="round"/></svg>
        ${cert.dateDisplay}
      </span>
      <p class="cert-desc">${cert.description}</p>
      <div class="tag-pills">
        ${cert.skills.map((s) => `<span>${s}</span>`).join('')}
      </div>
      <div class="cert-actions">
        <button type="button" class="btn btn-outline btn-sm" data-cert-view="${cert.slug}" ${canView ? '' : 'disabled'}>View Certificate</button>
        ${canView
          ? `<a class="btn btn-outline btn-sm" href="${cert.pdfUrl}" download>Download PDF</a>`
          : `<button type="button" class="btn btn-outline btn-sm" disabled>Download</button>`}
      </div>
      ${canView ? '' : '<p class="cert-status">Certificate file coming soon</p>'}
    </article>
  `;
}

function sortCerts(list, mode) {
  const sorted = [...list];
  if (mode === 'oldest') {
    sorted.sort((a, b) => (a.date || '0000') > (b.date || '0000') ? 1 : -1);
  } else if (mode === 'org') {
    sorted.sort((a, b) => a.org.localeCompare(b.org) || (b.date || '0000').localeCompare(a.date || '0000'));
  } else {
    sorted.sort((a, b) => (b.date || '0000') > (a.date || '0000') ? 1 : -1);
  }
  return sorted;
}

async function renderCertificates() {
  const container = document.getElementById('cert-container');
  if (!container) return;

  const searchInput = document.getElementById('cert-search-input');
  const sortSelect = document.getElementById('cert-sort-select');
  const filterBar = document.getElementById('cert-filter-bar');
  const emptyState = document.getElementById('cert-empty');

  let certs = [];
  try {
    const res = await fetch('assets/data/certificates.json');
    certs = await res.json();
  } catch (err) {
    container.innerHTML = '<p class="lede">Certificates could not be loaded right now.</p>';
    console.error(err);
    return;
  }

  const state = { search: '', category: 'all', sort: 'newest' };

  function render() {
    const sorted = sortCerts(certs, state.sort);
    const byCategory = {};
    sorted.forEach((c) => {
      if (!byCategory[c.category]) byCategory[c.category] = [];
      byCategory[c.category].push(c);
    });

    container.innerHTML = CERT_CATEGORIES
      .filter((cat) => byCategory[cat.slug] && byCategory[cat.slug].length)
      .map((cat) => `
        <div class="cert-category" data-category-section="${cat.slug}">
          <div class="cert-category-head">
            <h2>${cat.title}</h2>
            <p>${cat.description}</p>
          </div>
          <div class="cert-grid">
            ${byCategory[cat.slug].map(certCardHTML).join('')}
          </div>
        </div>
      `).join('');

    applyFilters();
    if (typeof initReveal === 'function') initReveal();
    wireCardEvents(certs);
  }

  function applyFilters() {
    const term = state.search.trim().toLowerCase();
    let visibleCount = 0;

    container.querySelectorAll('.cert-category').forEach((section) => {
      const categorySlug = section.dataset.categorySection;
      const categoryMatches = state.category === 'all' || state.category === categorySlug;
      let sectionHasVisible = false;

      section.querySelectorAll('.cert-card').forEach((card) => {
        const searchMatches = !term || card.dataset.search.includes(term);
        const visible = categoryMatches && searchMatches;
        card.style.display = visible ? '' : 'none';
        if (visible) { sectionHasVisible = true; visibleCount++; }
      });

      section.style.display = sectionHasVisible ? '' : 'none';
    });

    if (emptyState) emptyState.classList.toggle('visible', visibleCount === 0);
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value;
      applyFilters();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      render();
    });
  }

  if (filterBar) {
    filterBar.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.category = pill.dataset.filter;
        applyFilters();
      });
    });
  }

  render();
}

function wireCardEvents(certs) {
  document.querySelectorAll('[data-cert-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cert = certs.find((c) => c.slug === btn.dataset.certView);
      if (cert) openCertModal(cert);
    });
  });
}

function openCertModal(cert) {
  const overlay = document.getElementById('cert-modal');
  if (!overlay) return;

  document.getElementById('cert-modal-title').textContent = cert.title;
  document.getElementById('cert-modal-badge').textContent = cert.orgShort;
  document.getElementById('cert-modal-badge').style.background = cert.orgColor;
  document.getElementById('cert-modal-org').textContent = cert.org;
  document.getElementById('cert-modal-date').textContent = cert.dateDisplay;
  document.getElementById('cert-modal-desc').textContent = cert.description;
  document.getElementById('cert-modal-skills').innerHTML = cert.skills.map((s) => `<span>${s}</span>`).join('');

  const previewSlot = document.getElementById('cert-modal-preview-slot');
  const download = document.getElementById('cert-modal-download');
  previewSlot.innerHTML = '';
  if (cert.pdfUrl) {
    download.href = cert.pdfUrl;
    download.removeAttribute('disabled');
  } else {
    previewSlot.innerHTML = '<div class="gallery-placeholder">Certificate file coming soon.</div>';
    download.removeAttribute('href');
    download.setAttribute('disabled', 'true');
  }

  overlay.classList.add('open');

  if (cert.pdfUrl) {
    requestAnimationFrame(() => {
      previewSlot.innerHTML = `<iframe class="cert-modal-preview" title="Certificate preview" src="${cert.pdfUrl}"></iframe>`;
    });
  }
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('DOMContentLoaded', renderCertificates);
