function initHeroCarousel() {
  const track = document.getElementById('hero-carousel-track');
  if (!track) return;

  const slides = Array.from(track.children);
  const dots = Array.from(document.querySelectorAll('.hero-carousel-dot'));
  const prevBtn = document.querySelector('.hero-carousel-prev');
  const nextBtn = document.querySelector('.hero-carousel-next');
  let index = 0;
  let timer = null;

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, di) => dot.classList.toggle('active', di === index));
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 6000);
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(index + 1); restartAutoplay(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(index - 1); restartAutoplay(); });
  dots.forEach((dot) => {
    dot.addEventListener('click', () => { goTo(Number(dot.dataset.index)); restartAutoplay(); });
  });

  restartAutoplay();
}

document.addEventListener('DOMContentLoaded', initHeroCarousel);
