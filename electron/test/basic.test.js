const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Project structure', () => {
  it('should have main.js entry point', () => {
    const mainPath = path.join(__dirname, '..', 'main.js');
    assert.ok(fs.existsSync(mainPath), 'main.js should exist');
  });

  it('should have preload.js', () => {
    const preloadPath = path.join(__dirname, '..', 'preload.js');
    assert.ok(fs.existsSync(preloadPath), 'preload.js should exist');
  });

  it('should have renderer.js', () => {
    const rendererPath = path.join(__dirname, '..', 'renderer.js');
    assert.ok(fs.existsSync(rendererPath), 'renderer.js should exist');
  });

  it('should have valid package.json', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    assert.equal(pkg.main, 'main.js');
    assert.ok(pkg.name, 'should have a name');
    assert.ok(pkg.version, 'should have a version');
  });

  it('should have index.html', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    assert.ok(fs.existsSync(htmlPath), 'index.html should exist');
  });
});

describe('preload.js exports', () => {
  it('should expose expected IPC channels', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf-8');
    const expectedChannels = [
      'get-sessions',
      'save-sessions',
      'show-session',
      'create-session',
      'remove-session',
      'rename-session',
      'reload-session',
    ];
    for (const channel of expectedChannels) {
      assert.ok(content.includes(channel), `preload.js should reference channel "${channel}"`);
    }
  });
});
