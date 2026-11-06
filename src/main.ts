import { APP_NAME } from './app-name';
import { loadCourses } from './content/load';
import { createProgressStore } from './progress';
import { parseHash } from './router';
import { simValidators } from './sims/node-registry';
import { renderChapter } from './ui/chapter-view';
import { h } from './ui/dom';
import { renderMap } from './ui/map-view';
import '@fontsource/do-hyeon/400.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './ui/theme.css';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const root = document.getElementById('app')!;
const courses = loadCourses(simValidators());
const progress = createProgressStore(storage());
const view = h('main', { class: 'view' });
root.append(
  h(
    'div',
    { class: 'app' },
    h('header', { class: 'topbar' }, h('h1', {}, h('a', { href: '#map' }, APP_NAME)), h('span', { class: 'sub' }, '개념은 여기서, 진짜 실행은 저장소에서')),
    view,
  ),
);

let cleanup: () => void = () => {};
function render() {
  cleanup();
  cleanup = () => {};
  view.replaceChildren();
  const r = parseHash(location.hash, courses);
  if (r.kind === 'chapter') {
    const c = courses.find((x) => x.id === r.course)!;
    const ch = c.chapters.find((x) => x.id === r.chapter)!;
    document.title = `${ch.id.toUpperCase()} ${ch.title} · ${APP_NAME}`;
    cleanup = renderChapter(view, c, ch, progress);
  } else {
    document.title = APP_NAME;
    renderMap(view, courses, progress);
  }
  window.scrollTo(0, 0);
}
addEventListener('hashchange', render);
render();
