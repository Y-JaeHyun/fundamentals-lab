import { expect, test } from 'vitest';
import { APP_NAME } from '../src/app-name';

test('app name', () => {
  expect(APP_NAME).toBe('기초체력 랩');
});
