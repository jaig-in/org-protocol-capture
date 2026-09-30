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
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function pngSize(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

for (const browser of ['chrome', 'firefox']) {
  test(`${browser} manifest points at real icon files`, async () => {
    const manifestUrl = new URL(`../manifests/${browser}.json`, import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
    assert.deepEqual(
      Object.keys(manifest.icons).sort(),
      ['128', '16', '32', '48'],
    );
    assert.deepEqual(manifest.action.default_icon, manifest.icons);
    for (const [size, file] of Object.entries(manifest.icons)) {
      const bytes = await readFile(new URL(`../src/${file}`, import.meta.url));
      const actual = pngSize(bytes);
      assert.equal(actual.width, Number(size));
      assert.equal(actual.height, Number(size));
    }
  });
}
