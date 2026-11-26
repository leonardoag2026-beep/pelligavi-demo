import { copyFile, mkdir, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const vendor = ['three.module.min.js', 'cannon-es.js'];

for (const arquivo of vendor) {
  const destino = resolve(raiz, 'dist/shared/lib', arquivo);
  await mkdir(dirname(destino), { recursive: true });
  await copyFile(resolve(raiz, 'src/shared/lib', arquivo), destino);
  console.log(`vendor: dist/shared/lib/${arquivo}`);
}

await cp(resolve(raiz, 'src/shared/assets'), resolve(raiz, 'dist/shared/assets'), { recursive: true });
console.log('assets: dist/shared/assets');
