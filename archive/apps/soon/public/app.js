const backdrop = document.querySelector('#backdrop');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function startScreenshots() {
  try {
    const response = await fetch('/screenshots.json');
    if (!response.ok)
      return;

    const images = await response.json();
    if (!Array.isArray(images) || images.length === 0)
      return;

    let index = Math.floor(Math.random() * images.length);

    function showImage(imageIndex, fade = false) {
      const nextImage = new Image();
      nextImage.onload = () => {
        if (fade) {
          backdrop.style.opacity = '0';
          window.setTimeout(() => {
            backdrop.style.backgroundImage = `url("${images[imageIndex]}")`;
            backdrop.style.opacity = '.62';
          }, 900);
          return;
        }

        backdrop.style.backgroundImage = `url("${images[imageIndex]}")`;
        backdrop.style.opacity = '.62';
      };
      nextImage.src = images[imageIndex];
    }

    showImage(index);
    if (prefersReducedMotion || images.length < 2)
      return;

    window.setInterval(() => {
      index = (index + 1) % images.length;
      showImage(index, true);
    }, 9000);
  } catch {
    backdrop.remove();
  }
}

void startScreenshots();
