import { createHmac, timingSafeEqual } from 'node:crypto';

const HORAS = Number(process.env.JWT_HORAS || 12);

const segredo = () => process.env.JWT_SECRET || 'pelligavi-dev-secret-troque-em-producao';

const codificar = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');

const assinaturaDe = (cabecalho, conteudo) =>
  createHmac('sha256', segredo()).update(`${cabecalho}.${conteudo}`).digest('base64url');

export const assinar = ({ sub, sid, nome }) => {
  const agora = Math.floor(Date.now() / 1000);
  const expiraEm = agora + HORAS * 3600;
  const cabecalho = codificar({ alg: 'HS256', typ: 'JWT' });
  const conteudo = codificar({ sub, sid, nome, iss: 'pelligavi', iat: agora, exp: expiraEm });
  return {
    token: `${cabecalho}.${conteudo}.${assinaturaDe(cabecalho, conteudo)}`,
    expiraEm,
  };
};

export const verificar = (token) => {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) return null;
  const [cabecalho, conteudo, assinatura] = partes;
  const esperada = assinaturaDe(cabecalho, conteudo);
  const recebida = Buffer.from(assinatura);
  const calculada = Buffer.from(esperada);
  if (recebida.length !== calculada.length || !timingSafeEqual(recebida, calculada)) return null;
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload?.exp || payload.exp * 1000 <= Date.now()) return null;
  if (payload.iss !== 'pelligavi') return null;
  return payload;
};

export const doCabecalho = (cabecalho) => {
  const bruto = String(cabecalho || '');
  const [, token] = bruto.split(' ');
  return /^Bearer$/i.test(bruto.split(' ')[0]) ? token : null;
};
