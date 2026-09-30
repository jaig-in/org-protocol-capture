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

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

for (const browser of ['chrome', 'firefox']) {
  const destination = new URL(`dist/${browser}/`, root);
  const manifest = JSON.parse(await readFile(new URL(`manifests/${browser}.json`, root), 'utf8'));
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(new URL('src/', root), destination, { recursive: true });
  await writeFile(new URL('manifest.json', destination), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Built dist/${browser}`);
}
