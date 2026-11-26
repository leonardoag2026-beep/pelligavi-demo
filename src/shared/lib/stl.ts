export interface MalhaSTL {
  posicoes: Float32Array;
  triangulos: number;
}

const lerBase64 = (dataUrl: string): ArrayBuffer | null => {
  try {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
};

const daBinario = (buffer: ArrayBuffer): MalhaSTL | null => {
  if (buffer.byteLength < 84) return null;
  const vista = new DataView(buffer);
  const total = vista.getUint32(80, true);
  if (total <= 0 || 84 + total * 50 > buffer.byteLength) return null;
  const posicoes = new Float32Array(total * 9);
  let offset = 84;
  let i = 0;
  for (let t = 0; t < total; t += 1) {
    offset += 12;
    for (let v = 0; v < 3; v += 1) {
      posicoes[i] = vista.getFloat32(offset, true);
      posicoes[i + 1] = vista.getFloat32(offset + 4, true);
      posicoes[i + 2] = vista.getFloat32(offset + 8, true);
      i += 3;
      offset += 12;
    }
    offset += 2;
  }
  return { posicoes, triangulos: total };
};

const deAscii = (texto: string): MalhaSTL | null => {
  const valores: number[] = [];
  const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g;
  let achado = re.exec(texto);
  while (achado) {
    valores.push(Number(achado[1]), Number(achado[2]), Number(achado[3]));
    achado = re.exec(texto);
  }
  if (valores.length < 9) return null;
  return { posicoes: new Float32Array(valores), triangulos: Math.floor(valores.length / 9) };
};

export const lerSTL = (buffer: ArrayBuffer): MalhaSTL | null => {
  const binario = daBinario(buffer);
  if (binario) return binario;
  try {
    return deAscii(new TextDecoder().decode(buffer));
  } catch {
    return null;
  }
};

export const lerSTLDeUrl = (origem: string): MalhaSTL | null => {
  const buffer = lerBase64(origem);
  return buffer ? lerSTL(buffer) : null;
};

export const limitesSTL = (malha: MalhaSTL) => {
  const pos = malha.posicoes;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    if (pos[i]! < minX) minX = pos[i]!;
    if (pos[i]! > maxX) maxX = pos[i]!;
    if (pos[i + 1]! < minY) minY = pos[i + 1]!;
    if (pos[i + 1]! > maxY) maxY = pos[i + 1]!;
    if (pos[i + 2]! < minZ) minZ = pos[i + 2]!;
    if (pos[i + 2]! > maxZ) maxZ = pos[i + 2]!;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
};
