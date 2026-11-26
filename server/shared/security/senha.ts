import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 32;

export const gerarHash = (senha: string): string => {
  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, sal, TAMANHO, { N, r: R, p: P }).toString('hex');
  return `scrypt$${N}$${R}$${P}$${sal}$${hash}`;
};

export const conferirSenha = (senha: string, guardado: string | null): boolean => {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, sal, hash] = partes;
  const alvo = Buffer.from(hash, 'hex');
  const calculado = scryptSync(senha, sal, alvo.length, { N: Number(n), r: Number(r), p: Number(p) });
  return calculado.length === alvo.length && timingSafeEqual(calculado, alvo);
};

export const senhaForte = (senha: string): boolean => typeof senha === 'string' && senha.length >= 6 && senha.length <= 72;
