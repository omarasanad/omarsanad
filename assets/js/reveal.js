function initReveal() {
  const revealEls = document.querySelectorAll('.reveal:not(.is-observed)');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => {
    el.classList.add('is-observed');
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', initReveal);
