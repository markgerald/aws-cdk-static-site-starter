import * as fs from 'fs';
import * as path from 'path';

describe('website build output', () => {
  test('uses relative asset paths so index.html works when opened directly', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'website_dist', 'index.html'), 'utf8');

    expect(indexHtml).not.toContain('src="/assets/');
    expect(indexHtml).not.toContain('href="/assets/');
    expect(indexHtml).toContain('src="./assets/');
    expect(indexHtml).toContain('href="./assets/');
  });
});
