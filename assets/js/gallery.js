function initDrawingGallery() {
  const overlay = document.getElementById('drawing-modal');
  if (!overlay) return;

  const img = document.getElementById('drawing-modal-img');
  const caption = document.getElementById('drawing-modal-caption');
  const openFull = document.getElementById('drawing-modal-open-full');

  document.querySelectorAll('.drawing-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.src;
      const label = thumb.dataset.label;
      img.src = src;
      img.alt = label;
      caption.textContent = label;
      openFull.href = src;

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  });
}

document.addEventListener('DOMContentLoaded', initDrawingGallery);
