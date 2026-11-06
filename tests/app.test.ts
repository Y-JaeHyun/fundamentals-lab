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

test('no runtime requests to external hosts (fonts are bundled)', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const html = readFileSync(join(import.meta.dirname, '../index.html'), 'utf8');
  const css = readFileSync(join(import.meta.dirname, '../src/ui/theme.css'), 'utf8');
  expect(html + css).not.toMatch(/https?:\/\/(?!github\.com)/);
});
