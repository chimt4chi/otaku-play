import { queryIsTv } from './nativePlayer';

// TV (10-foot) mode: detection plus D-pad spatial navigation. The flag is resolved once,
// before the app renders, so components can read it synchronously.
let tv = false;
// Until the first key press, focus follows the best default as content loads in
let userHasNavigated = false;
export const isTv = () => tv;

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// Clickable elements in the app that are not natively focusable; TV mode makes them so
const CLICKABLE_EXTRAS = '.search-result-card, .season-tab-card, .brand-logo';
// Overlays that trap focus while open. The last match in the document is the topmost.
const OVERLAYS = '.ota-modal-backdrop, .search-modal-backdrop, .watch-party-drawer';
// Where focus should land first, in priority order
const PREFERRED = ['[data-tv-autofocus]', '.episode-cell-btn.active', '.btn-primary', '.tv-card', '.anime-card'];
// Persistent navigation: never the default target
const CHROME = '.navbar, .tv-rail';
// Last focused element outside the side rail, restored when leaving the rail
let lastContent = null;

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function getScope() {
  const overlays = document.querySelectorAll(OVERLAYS);
  return overlays.length ? overlays[overlays.length - 1] : document.body;
}

function isVisible(el) {
  if (el.disabled || el.closest('[aria-hidden="true"]')) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

const focusables = (scope) => [...scope.querySelectorAll(FOCUSABLE)].filter(isVisible);

function focusElement(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (!el.closest(CHROME)) lastContent = el;
  // Rows that position themselves (TV home) and the fixed rail need no page scrolling
  if (el.matches('[data-tv-managed-scroll]') || el.closest('.tv-rail')) return;
  // Keep the focused item comfortably on screen, like the moving rows on a TV launcher.
  // Anything on the first screen scrolls back to the top so the top bar stays reachable.
  const absoluteBottom = el.getBoundingClientRect().bottom + window.scrollY;
  const onFirstScreen = absoluteBottom < window.innerHeight && !el.closest(OVERLAYS);
  el.scrollIntoView({ block: onFirstScreen ? 'nearest' : 'center', inline: 'center', behavior: 'smooth' });
  if (onFirstScreen) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function focusDefault(scope) {
  const items = focusables(scope).filter(el => !el.closest(CHROME));
  for (const selector of PREFERRED) {
    const match = items.find(el => el.matches(selector));
    if (match) return focusElement(match);
  }
  return focusElement(items[0] || focusables(scope)[0]);
}

// Distance from `from` to `to` in a direction; null if `to` does not lie that way
function score(from, to, dir) {
  const horizontal = dir === 'left' || dir === 'right';
  const fc = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
  const tc = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
  const ahead =
    dir === 'left' ? tc.x < fc.x - 1 :
    dir === 'right' ? tc.x > fc.x + 1 :
    dir === 'up' ? to.bottom <= from.top + from.height / 2 :
    to.top >= from.bottom - from.height / 2;
  if (!ahead) return null;

  const primary = Math.max(0,
    dir === 'left' ? from.left - to.right :
    dir === 'right' ? to.left - from.right :
    dir === 'up' ? from.top - to.bottom :
    to.top - from.bottom);
  // Gap on the other axis: zero when the two elements share a row / column
  const gap = horizontal
    ? Math.max(0, to.top - from.bottom, from.top - to.bottom)
    : Math.max(0, to.left - from.right, from.left - to.right);
  // Left/right never jump to another row
  if (horizontal && gap > 0) return null;

  const offset = horizontal ? Math.abs(tc.y - fc.y) : Math.abs(tc.x - fc.x);
  return primary + gap * 3 + offset * 0.2;
}

function move(dir) {
  const scope = getScope();
  const current = document.activeElement;
  if (!current || current === document.body || !scope.contains(current)) {
    focusDefault(scope);
    return;
  }

  const inRail = Boolean(current.closest('.tv-rail'));
  if (inRail && dir === 'right') {
    if (lastContent?.isConnected && isVisible(lastContent)) focusElement(lastContent);
    else focusDefault(scope);
    return;
  }
  if (inRail && dir === 'left') return;

  const from = current.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  for (const el of focusables(scope)) {
    // Skip itself, its ancestors, and controls nested inside the focused card
    if (el === current || el.contains(current) || current.contains(el)) continue;
    // The rail is entered with Left from the edge of the content, never by up/down
    if (Boolean(el.closest('.tv-rail')) !== inRail) continue;
    const s = score(from, el.getBoundingClientRect(), dir);
    if (s !== null && s < bestScore) {
      best = el;
      bestScore = s;
    }
  }

  if (best) focusElement(best);
  else if (dir === 'left' && !inRail && scope === document.body) {
    lastContent = current;
    focusElement(document.querySelector('.tv-rail-item.active') || document.querySelector('.tv-rail-item'));
  } else if (dir === 'up' || dir === 'down') {
    window.scrollBy({ top: dir === 'up' ? -240 : 240, behavior: 'smooth' });
  }
}

function onKeyDown(event) {
  if (event.defaultPrevented) return;
  const dir = ARROWS[event.key];
  const el = document.activeElement;

  if (dir || event.key === 'Enter') userHasNavigated = true;

  if (dir) {
    // Let left/right move the caret inside text fields until it reaches an end
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && (dir === 'left' || dir === 'right')) {
      const atEdge = dir === 'left' ? el.selectionStart === 0 : el.selectionEnd === el.value.length;
      if (!atEdge) return;
    }
    event.preventDefault();
    move(dir);
  } else if (event.key === 'Enter' && el?.matches?.(CLICKABLE_EXTRAS)) {
    event.preventDefault();
    el.click();
  }
}

// Screens and dialogs change underneath the remote; make sure something stays focused
function watchDom() {
  let timer = null;
  const refresh = () => {
    timer = null;
    document.querySelectorAll(CLICKABLE_EXTRAS).forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
    const scope = getScope();
    const el = document.activeElement;
    const lost = !el || el === document.body || !scope.contains(el);
    if (lost || !userHasNavigated) focusDefault(scope);
  };
  new MutationObserver(() => {
    if (!timer) timer = setTimeout(refresh, 250);
  }).observe(document.body, { childList: true, subtree: true });
  refresh();
}

export async function initTv() {
  // ?tv=1 previews TV mode in a desktop browser
  const forced = new URLSearchParams(window.location.search).get('tv') === '1';
  const detected = await Promise.race([
    queryIsTv(),
    new Promise(resolve => setTimeout(() => resolve(false), 1500)),
  ]);
  tv = forced || detected;
  if (!tv) return;
  document.documentElement.classList.add('tv-mode');
  window.addEventListener('keydown', onKeyDown);
  watchDom();
}
