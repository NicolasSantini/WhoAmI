// Loaded before first paint: motion styles apply only when JS runs and the visitor accepts motion.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('anim');
}
