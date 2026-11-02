// Scroll stays native: this file only reads the position and paints the game on top.
const FRAME_DISTANCE = 26;
const LANE_SPEED = 0.42;
const PIN_SPEED = 1.15;
const IDLE_FRAME = '4';
const FOCUS_DELAY = 40;

const root = document.documentElement;
const animated = root.classList.contains('anim');
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const xp = document.querySelector<HTMLProgressElement>('[data-xp]');
const chapterLabel = document.querySelector<HTMLElement>('[data-chapter-label]');
const toast = document.querySelector<HTMLElement>('[data-toast]');
const lane = document.querySelector<HTMLElement>('[data-lane]');
const runner = lane?.querySelector<SVGElement>('[data-runner]');
const flags = document.querySelector<HTMLElement>('[data-flags]');

const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')].map((element) => ({
  element,
  label: element.dataset.chapter ?? '',
  world: element.dataset.world ?? 'start',
  top: 0,
  seen: false,
  flag: undefined as HTMLElement | undefined,
}));

const heroes = [...document.querySelectorAll<HTMLElement>('[data-progress]')].map((element) => ({
  element,
  top: 0,
  distance: 0,
}));

const tracks = [...document.querySelectorAll<HTMLElement>('[data-hscroll]')].flatMap((section) => {
  const track = section.querySelector<HTMLElement>('.hs-track');
  if (!track) return [];
  const cards = [...track.querySelectorAll<HTMLElement>('.hs-card')];
  const counter = section.querySelector<HTMLElement>('[data-hs-counter]');
  return [{ section, track, cards, counter, top: 0, distance: 0, pinned: 0 }];
});

for (const chapter of chapters) {
  if (!flags) break;
  const flag = document.createElement('span');
  flag.className = 'flag';
  flags.append(flag);
  chapter.flag = flag;
}

const STAR_TILE = 320;
const starfields = [...document.querySelectorAll<HTMLElement>('[data-stars]')].map((element) => ({
  element,
  speed: Number(element.dataset.stars),
  tile: element.classList.contains('near') ? STAR_TILE * 2 : STAR_TILE,
}));

const pinnedLayout = () => animated && matchMedia('(min-height: 520px)').matches;

function measure() {
  const pinned = pinnedLayout();
  for (const item of tracks) {
    const width = item.track.offsetWidth - root.clientWidth;
    item.distance = pinned ? Math.max(0, width) : 0;
    item.pinned = item.distance * PIN_SPEED;
    if (pinned) {
      item.section.style.setProperty('--hs-height', `${item.pinned + window.innerHeight}px`);
    } else {
      item.section.style.removeProperty('--hs-height');
      item.track.style.removeProperty('transform');
    }
  }
  const scroll = window.scrollY;
  for (const item of tracks) item.top = item.section.getBoundingClientRect().top + scroll;
  for (const hero of heroes) {
    hero.top = hero.element.getBoundingClientRect().top + scroll;
    hero.distance = hero.element.offsetHeight - window.innerHeight;
  }
  const runnerLeft = runner?.getBoundingClientRect().left ?? 0;
  for (const chapter of chapters) {
    chapter.top = chapter.element.getBoundingClientRect().top + scroll;
    chapter.flag?.style.setProperty('--at', `${chapter.top * LANE_SPEED + runnerLeft}px`);
  }
}

let runTimer = 0;
let lastScroll = window.scrollY;
let current = -1;

function moveRunner(scroll: number) {
  if (!runner) return;
  runner.dataset.frame = String(Math.floor(scroll / FRAME_DISTANCE) % 4);
  if (scroll !== lastScroll) runner.classList.toggle('backwards', scroll < lastScroll);
  window.clearTimeout(runTimer);
  runTimer = window.setTimeout(() => {
    runner.dataset.frame = IDLE_FRAME;
  }, 140);
}

function showCheckpoint(label: string) {
  if (!toast) return;
  toast.textContent = `Checkpoint · ${label}`;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
}

function updateChapter(scroll: number) {
  const line = scroll + window.innerHeight * 0.45;
  let index = 0;
  chapters.forEach((chapter, position) => {
    if (chapter.top <= line) index = position;
    chapter.flag?.classList.toggle('reached', chapter.top <= line);
  });
  if (index === current || !chapters[index]) return;
  current = index;
  const chapter = chapters[index];
  root.dataset.world = chapter.world;
  if (chapterLabel) chapterLabel.textContent = chapter.label;
  if (!chapter.seen && index > 0 && animated) showCheckpoint(chapter.label);
  chapter.seen = true;
}

function paint() {
  ticking = false;
  const scroll = window.scrollY;
  const total = root.scrollHeight - window.innerHeight;
  if (xp) xp.value = total > 0 ? Math.round((scroll / total) * 100) : 0;
  updateChapter(scroll);

  if (animated) {
    moveRunner(scroll);
    lane?.style.setProperty('--x', String(Math.round(scroll * LANE_SPEED)));
    for (const { element, speed, tile } of starfields) {
      element.style.transform = `translate3d(0,${-Math.round((scroll * speed) % tile)}px,0)`;
    }
    for (const hero of heroes) {
      const progress = hero.distance > 0 ? clamp((scroll - hero.top) / hero.distance) : 0;
      hero.element.style.setProperty('--p', progress.toFixed(3));
    }
    for (const item of tracks) {
      if (!item.distance) continue;
      const progress = clamp((scroll - item.top) / item.pinned);
      item.track.style.transform = `translate3d(${-Math.round(progress * item.distance)}px,0,0)`;
      const active = Math.round(progress * (item.cards.length - 1));
      item.cards.forEach((card, index) => card.classList.toggle('is-active', index === active));
      if (item.counter) item.counter.textContent = `${active + 1} / ${item.cards.length}`;
    }
  }
  lastScroll = scroll;
}

let ticking = false;
function requestPaint() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(paint);
}

function animateCount(element: HTMLElement) {
  const target = Number(element.dataset.count);
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / 700);
    element.textContent = String(Math.round(target * progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateBar(bar: HTMLProgressElement) {
  const target = Number(bar.dataset.value);
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / 900);
    bar.value = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function enter(element: HTMLElement) {
  element.classList.add('in');
  element.querySelectorAll<HTMLElement>('[data-count]').forEach(animateCount);
  element.querySelectorAll<HTMLProgressElement>('progress[data-value]').forEach(animateBar);
}

function setUpReveals() {
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!animated) return;
  for (const group of document.querySelectorAll<HTMLElement>('[data-stagger]')) {
    [...group.children].forEach((child, index) => {
      (child as HTMLElement).style.setProperty('--order', String(index));
    });
  }
  for (const bar of document.querySelectorAll<HTMLProgressElement>('progress[data-value]')) {
    bar.value = 0;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        enter(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  items.forEach((item) => observer.observe(item));
}

// A pinned track hides later cards: tabbing to one must scroll it into view.
for (const item of tracks) {
  item.track.addEventListener('focusin', (event) => {
    if (!item.distance) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>('.hs-card');
    const index = card ? item.cards.indexOf(card) : -1;
    if (index < 0 || item.cards.length < 2) return;
    const top = item.top + (index / (item.cards.length - 1)) * item.pinned;
    // The browser runs its own focus scroll after this event: go last.
    window.setTimeout(() => window.scrollTo({ top, behavior: 'instant' }), FOCUS_DELAY);
  });
}

// Native popovers stay open on in-page links: a jump must also close the menu.
const menu = document.querySelector<HTMLElement>('#menu');
menu?.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) menu.hidePopover();
});

measure();
setUpReveals();
paint();
window.addEventListener('scroll', requestPaint, { passive: true });
new ResizeObserver(() => {
  measure();
  requestPaint();
}).observe(document.body);
document.fonts?.ready.then(() => {
  measure();
  requestPaint();
});
