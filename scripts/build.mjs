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
