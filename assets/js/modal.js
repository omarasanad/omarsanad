function initModals() {
  const overlays = document.querySelectorAll('.modal-overlay');
  let lastFocused = null;

  const openModal = (overlay) => {
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (overlay) => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  document.querySelectorAll('[data-modal-target]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const overlay = document.getElementById(trigger.dataset.modalTarget);
      if (overlay) openModal(overlay);
    });
  });

  overlays.forEach((overlay) => {
    overlay.querySelectorAll('.modal-close, [data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(overlay));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    overlays.forEach((overlay) => {
      if (overlay.classList.contains('open')) closeModal(overlay);
    });
  });
}

document.addEventListener('DOMContentLoaded', initModals);
