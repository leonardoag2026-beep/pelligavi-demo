import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const HORAS = Number(process.env.JWT_HORAS || 12);

// sem JWT_SECRET o segredo é aleatório por processo: ninguém forja token com uma
// constante pública (o preço é todo mundo relogar quando a API reinicia)
const SEGREDO_EFEMERO = randomBytes(32).toString('hex');
const segredo = (): string => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!SEGREDO_EFEMERO_AVISADO) {
    SEGREDO_EFEMERO_AVISADO = true;
    console.warn('[jwt] JWT_SECRET ausente — usando segredo aleatório desta execução');
  }
  return SEGREDO_EFEMERO;
};
let SEGREDO_EFEMERO_AVISADO = false;

const codificar = (objeto: unknown): string => Buffer.from(JSON.stringify(objeto)).toString('base64url');

const assinaturaDe = (cabecalho: string, conteudo: string): string =>
  createHmac('sha256', segredo()).update(`${cabecalho}.${conteudo}`).digest('base64url');

export interface PayloadToken {
  sub: string;
  nome: string;
  iss: string;
  iat: number;
  exp: number;
}

export const assinar = ({ sub, nome }: { sub: string; nome: string }): { token: string; expiraEm: number } => {
  const agora = Math.floor(Date.now() / 1000);
  const expiraEm = agora + HORAS * 3600;
  const cabecalho = codificar({ alg: 'HS256', typ: 'JWT' });
  const conteudo = codificar({ sub, nome, iss: 'pelligavi', iat: agora, exp: expiraEm });
  return { token: `${cabecalho}.${conteudo}.${assinaturaDe(cabecalho, conteudo)}`, expiraEm };
};

export const verificar = (token: string | null | undefined): PayloadToken | null => {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) return null;
  const [cabecalho, conteudo, assinatura] = partes;
  const esperada = assinaturaDe(cabecalho, conteudo);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8')) as PayloadToken;
    if (dados.exp * 1000 < Date.now()) return null;
    return dados;
  } catch {
    return null;
  }
};
