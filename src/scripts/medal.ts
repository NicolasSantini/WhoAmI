const MAX_TILT = 16;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function addTilt(medal: HTMLElement, stage: HTMLElement) {
  stage.addEventListener('pointermove', (event) => {
    const box = stage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    medal.style.setProperty('--tilt-x', (-y * 2 * MAX_TILT).toFixed(2));
    medal.style.setProperty('--tilt-y', (x * 2 * MAX_TILT).toFixed(2));
  });
  stage.addEventListener('pointerleave', () => {
    medal.style.setProperty('--tilt-x', '0');
    medal.style.setProperty('--tilt-y', '0');
  });
}

function addFlip(medal: HTMLElement, stage: HTMLElement, button: HTMLButtonElement) {
  const front = medal.querySelector('.medal-front');
  const back = medal.querySelector('.medal-back');
  const flip = () => {
    const flipped = medal.classList.toggle('is-flipped');
    button.textContent = flipped ? 'Mostra il fronte' : 'Mostra il retro';
    front?.setAttribute('aria-hidden', String(flipped));
    back?.setAttribute('aria-hidden', String(!flipped));
  };
  medal.classList.add('has-back');
  button.hidden = false;
  button.addEventListener('click', flip);
  stage.addEventListener('click', flip);
}

for (const medal of document.querySelectorAll<HTMLElement>('[data-medal]')) {
  const stage = medal.querySelector<HTMLElement>('.medal-stage');
  const button = medal.querySelector<HTMLButtonElement>('[data-medal-flip]');
  if (!stage) continue;
  if (!reducedMotion) addTilt(medal, stage);
  if (button) addFlip(medal, stage, button);
}
