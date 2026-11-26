import express from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import apiRoutes from '../shared/routes/api.routes.js';
import { erroMiddleware } from '../shared/middlewares/erro.middleware.js';
import { fecharBanco, pool } from '../config/db.js';

const PORTA = Number(process.env.PORT) || 8888;
const RAIZ = process.cwd();

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
  '.glb': 'model/gltf-binary',
  '.stl': 'model/stl',
};

const WEB_REACT = join(RAIZ, 'web/dist/client');

export const criarApp = () => {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', apiRoutes);

  // demo antigo (DOM puro) fica em /antigo
  app.use('/modelos', express.static(join(RAIZ, 'server/uploads/modelos')));
  app.use('/imagens', express.static(join(RAIZ, 'server/uploads/imagens')));
  app.use('/texturas', express.static(join(RAIZ, 'server/uploads/texturas')));
  app.use('/antigo', express.static(RAIZ, { index: 'index.html' }));

  // front em React (Vite) é o site, na raiz
  if (existsSync(WEB_REACT)) {
    app.use(express.static(WEB_REACT, { index: false }));
    // SPA: tudo que não é arquivo nem /api cai no index do React
    app.get(/^(?!\/api|\/antigo).*/, (_req, res) => res.sendFile(join(WEB_REACT, 'index.html')));
  }

  app.use(async (req, res, next) => {
    // /api que não casou rota é 404 JSON, nunca o index.html do site
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const caminho = normalize(decodeURIComponent(req.path)).replace(/^(\.\.[/\\])+/, '');
    const arquivo = join(RAIZ, caminho === '/' ? 'index.html' : caminho);
    const alvo = existsSync(arquivo) ? arquivo : join(RAIZ, 'index.html');
    try {
      const conteudo = await readFile(alvo);
      res.setHeader('Content-Type', MIME[extname(alvo)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(conteudo);
    } catch {
      return res.status(404).json({ erro: 'Arquivo não encontrado', codigo: 'nao_encontrado' });
    }
  });

  app.use('/api', (_req, res) =>
    res.status(404).json({ erro: 'Rota não encontrada', codigo: 'nao_encontrado' }),
  );

  app.use(erroMiddleware);
  return app;
};

const iniciar = async (): Promise<void> => {
  const app = criarApp();
  const servidor = app.listen(PORTA, () => {
    console.log(`API: http://127.0.0.1:${PORTA}/api/saude`);
    console.log(`Site: http://127.0.0.1:${PORTA}/`);
  });

  const encerrar = async (sinal: string): Promise<void> => {
    console.log(`[${sinal}] encerrando`);
    servidor.close();
    await fecharBanco();
    await pool.end().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', () => void encerrar('SIGINT'));
  process.on('SIGTERM', () => void encerrar('SIGTERM'));
};

const executadoDireto = process.argv[1]?.includes('server.js') || process.argv[1]?.includes('servidor.js');
if (executadoDireto) void iniciar();
