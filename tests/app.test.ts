import { expect, test } from 'vitest';

test('app boots to map and navigates to a chapter', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = '';
  await import('../src/main');
  expect(document.querySelectorAll('a.cell').length).toBeGreaterThan(0);
  location.hash = '#ebpf-00';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  expect(document.querySelector('.chapter-head h2')?.textContent).toBe('실습 환경');
  location.hash = '#nope';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  expect(document.querySelectorAll('a.cell').length).toBeGreaterThan(0);
});
