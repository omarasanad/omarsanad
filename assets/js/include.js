async function includePartial(mountSelector, url) {
  const mount = document.querySelector(mountSelector);
  if (!mount) return;
  try {
    const res = await fetch(url);
    mount.innerHTML = await res.text();
  } catch (err) {
    console.error(`Failed to load partial: ${url}`, err);
  }
}

function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const currentPage = document.body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      if (link.dataset.page === currentPage) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }
}

function initFooter() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    includePartial('#site-header-mount', 'partials/header.html'),
    includePartial('#site-footer-mount', 'partials/footer.html'),
  ]);
  initHeader();
  initFooter();
  document.dispatchEvent(new CustomEvent('partials:loaded'));
});
