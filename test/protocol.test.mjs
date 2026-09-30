// Copyright (C) 2026 Jai G
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 3, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCaptureUri } from '../src/protocol.js';

function parseCapture(input) {
  const uri = new URL(buildCaptureUri(input));
  assert.equal(uri.protocol, 'org-protocol:');
  assert.equal(uri.hostname, 'capture');
  assert.equal(uri.hash, '');
  const parameters = new URLSearchParams(uri.search);
  assert.equal(parameters.get('template'), 'p');
  return parameters;
}

test('preserves the original URL, title, and selection through one decoding', () => {
  const input = {
    url: 'https://例え.example/雪?q=100%25&quote="yes"&plus=a+b#part&two',
    title: 'Café 雪 — "quoted" & 100% + #heading\nSecond line',
    selection: '  First: "こんにちは" & \'quotes\' 100% %20 + #\nSecond line\r\nLast line  ',
    container: null,
  };
  const parameters = parseCapture(input);
  assert.equal(parameters.get('url'), input.url);
  assert.equal(parameters.get('title'), input.title);
  assert.equal(parameters.get('body'), input.selection);
});

test('accepts ordinary HTTP pages without inventing container context', () => {
  const input = {
    url: 'http://example.test:8080/path?x=1&y=2#fragment',
    title: 'Local page',
    selection: 'Selected passage',
    container: null,
  };
  const parameters = parseCapture(input);
  assert.equal(parameters.get('url'), input.url);
  assert.equal(parameters.get('body'), input.selection);
});

test('retains Firefox container name and cookie store ID alongside the selection', () => {
  const input = {
    url: 'https://example.test/',
    title: 'Container page',
    selection: 'A passage\nwith 100% & "quotes" + 雪',
    container: {
      name: 'Research 雪 & "notes" + 100%',
      cookieStoreId: 'firefox-container-7',
    },
  };
  const body = parseCapture(input).get('body');
  assert.ok(body.includes(input.selection), 'selection must remain intact');
  assert.ok(body.includes(input.container.name), 'container name must remain intact');
  assert.ok(body.includes(input.container.cookieStoreId), 'container ID must remain intact');
});

test('captures a page without selected text', () => {
  const parameters = parseCapture({
    url: 'https://example.test/',
    title: '',
    selection: '',
    container: null,
  });
  assert.equal(parameters.get('title'), '');
  assert.equal(parameters.get('body'), '');
});

test('retains Firefox context even without selected text', () => {
  const container = { name: 'Work', cookieStoreId: 'firefox-container-2' };
  const body = parseCapture({
    url: 'https://example.test/',
    title: 'No selection',
    selection: '',
    container,
  }).get('body');
  assert.ok(body.includes(container.name));
  assert.ok(body.includes(container.cookieStoreId));
});

test('rejects invalid URLs and non-HTTP(S) schemes', () => {
  for (const url of [
    '',
    'not a URL',
    '/relative/path',
    'http://',
    'ftp://example.test/file',
    'file:///tmp/page.html',
    'about:blank',
    'chrome://extensions/',
    'javascript:alert(1)',
    'data:text/plain,hello',
    'org-protocol://capture?template=p',
  ]) {
    assert.throws(
      () => buildCaptureUri({ url, title: 'Page', selection: '', container: null }),
      `must reject ${JSON.stringify(url)}`,
    );
  }
});
