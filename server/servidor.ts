import express, { type NextFunction, type Request, type Response } from 'express';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

const DIAS = 24 * 60 * 60 * 1000;
const TTL_PEDIDO = 7 * DIAS;
const TTL_SESSAO = 15 * DIAS;
const COOKIE = 'pg_sess';
const PORTA = Number(process.env.PORT) || 8897;
const RAIZ = process.cwd();

interface PedidoSessao {
  numero: number;
  id: string;
  total: number;
  tipo: 'entrega' | 'retirada';
  status: string;
  criadoEm: number;
}

interface Sessao {
  token: string;
  criadoEm: number;
  vistoEm: number;
  pedidos: Map<number, PedidoSessao>;
}

const sessoes = new Map<string, Sessao>();

const limpar = (): void => {
  const agora = Date.now();
  let pedidosFora = 0;
  let sessoesFora = 0;
  for (const [token, sessao] of sessoes) {
    if (agora - sessao.vistoEm > TTL_SESSAO) {
      sessoes.delete(token);
      sessoesFora += 1;
      continue;
    }
    for (const [numero, pedido] of sessao.pedidos) {
      if (agora - pedido.criadoEm > TTL_PEDIDO) {
        sessao.pedidos.delete(numero);
        pedidosFora += 1;
      }
    }
  }
  if (pedidosFora || sessoesFora) {
    console.log(`[limpeza] ${pedidosFora} pedido(s) +7 dias · ${sessoesFora} sessao(oes) ociosas +15 dias`);
  }
};

const lerCookies = (cabecalho: string | undefined): Record<string, string> =>
  (cabecalho || '').split(';').reduce<Record<string, string>>((acc, parte) => {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave) acc[chave] = decodeURIComponent(resto.join('='));
    return acc;
  }, {});

const sessaoDa = (req: Request): Sessao | null => {
  const token = lerCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const sessao = sessoes.get(token);
  if (!sessao) return null;
  if (Date.now() - sessao.vistoEm > TTL_SESSAO) {
    sessoes.delete(token);
    return null;
  }
  sessao.vistoEm = Date.now();
  return sessao;
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use((_req, _res, next) => {
  limpar();
  next();
});

app.post('/api/sessao', (req: Request, res: Response) => {
  const existente = sessaoDa(req);
  if (existente) {
    res.status(200).json({ ok: true, pedidos: existente.pedidos.size });
    return;
  }
  const token = randomUUID();
  const sessao: Sessao = { token, criadoEm: Date.now(), vistoEm: Date.now(), pedidos: new Map() };
  sessoes.set(token, sessao);
  console.log(`[sessao] nova ${token.slice(0, 8)} · total ${sessoes.size}`);
  res
    .status(201)
    .cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: TTL_SESSAO,
    })
    .json({ ok: true });
});

app.post('/api/pedidos', (req: Request, res: Response) => {
  const sessao = sessaoDa(req);
  if (!sessao) {
    res.status(401).json({ erro: 'sem sessao' });
    return;
  }
  const corpo = req.body as Partial<PedidoSessao>;
  const numero = Number(corpo.numero);
  if (!Number.isFinite(numero)) {
    res.status(400).json({ erro: 'numero invalido' });
    return;
  }
  sessao.pedidos.set(numero, {
    numero,
    id: String(corpo.id || `PLG-${numero}`),
    total: Number(corpo.total) || 0,
    tipo: corpo.tipo === 'retirada' ? 'retirada' : 'entrega',
    status: String(corpo.status || 'preparo'),
    criadoEm: Date.now(),
  });
  res.status(201).json({ ok: true, pedidos: sessao.pedidos.size });
});

app.get('/api/pedidos', (req: Request, res: Response) => {
  const sessao = sessaoDa(req);
  if (!sessao) {
    res.status(401).json({ erro: 'sem sessao' });
    return;
  }
  const lista = [...sessao.pedidos.values()].sort((a, b) => b.criadoEm - a.criadoEm);
  res.status(200).json({ pedidos: lista });
});

app.patch('/api/pedidos/:numero', (req: Request, res: Response) => {
  const sessao = sessaoDa(req);
  if (!sessao) {
    res.status(401).json({ erro: 'sem sessao' });
    return;
  }
  const numero = Number(req.params.numero);
  const pedido = sessao.pedidos.get(numero);
  if (!pedido) {
    res.status(404).json({ erro: 'pedido nao encontrado' });
    return;
  }
  const status = (req.body as { status?: string }).status;
  if (status) pedido.status = status;
  res.status(200).json({ ok: true, pedido });
});

app.post('/api/_debug/envelhecer', (req: Request, res: Response) => {
  const sessao = sessaoDa(req);
  if (!sessao) {
    res.status(401).json({ erro: 'sem sessao' });
    return;
  }
  const corpo = req.body as { pedidos?: number; sessao?: number };
  const diasPedido = Number(corpo.pedidos) || 0;
  const diasSessao = Number(corpo.sessao) || 0;
  for (const pedido of sessao.pedidos.values()) pedido.criadoEm -= diasPedido * DIAS;
  sessao.vistoEm -= diasSessao * DIAS;
  limpar();
  res.status(200).json({ ok: true, sessoes: sessoes.size, pedidos: sessao.pedidos.size });
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const caminho = normalize(req.path).replace(/^(\.\.[/\\])+/, '');
  const alvo = join(RAIZ, caminho === '/' ? 'index.html' : caminho);
  try {
    const dados = await readFile(alvo);
    res.type(MIME[extname(alvo)] || 'application/octet-stream').send(dados);
  } catch {
    next();
  }
});

app.use(async (_req: Request, res: Response) => {
  try {
    const dados = await readFile(join(RAIZ, 'index.html'));
    res.type('text/html').send(dados);
  } catch {
    res.status(404).type('text/plain').send('404');
  }
});

setInterval(limpar, 10 * 60 * 1000).unref();

app.listen(PORTA, () => {
  console.log(`Pelligavi demo em http://127.0.0.1:${PORTA}`);
  console.log(`sessao: cookie ${COOKIE} (httpOnly) · pedidos 7 dias · sessao ociosa 15 dias`);
});
