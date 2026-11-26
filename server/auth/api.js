import express from 'express';
import { assinar, verificar, doCabecalho } from './jwt.js';
import { gerarHash, conferirSenha, senhaForte } from './senha.js';
import * as repo from './repo.js';

const app = express();
const PORTA = Number(process.env.AUTH_PORT || 8811);
const HORAS = Number(process.env.JWT_HORAS || 12);

app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

const soDigitos = (valor) => String(valor || '').replace(/\D/g, '');
const ehEmail = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());

const identidade = (bruto) => {
  const valor = String(bruto || '').trim();
  if (ehEmail(valor)) return { email: valor.toLowerCase(), celular: null };
  const digitos = soDigitos(valor);
  if (digitos.length >= 10 && digitos.length <= 13) return { email: null, celular: digitos };
  return null;
};

const publica = (conta) => ({
  id: conta.id_conta,
  nome: conta.nome,
  identificador: conta.email || conta.celular,
  criadoEm: conta.criado_em ? new Date(conta.criado_em).getTime() : undefined,
});

const sessaoDe = async (conta, req) => {
  const { id_sessao, expira_em } = await repo.abrirSessao({
    idConta: conta.id_conta,
    horas: HORAS,
    userAgent: req.headers['user-agent'],
  });
  await repo.tocarLogin(conta.id_conta);
  const { token, expiraEm } = assinar({ sub: conta.id_conta, sid: id_sessao, nome: conta.nome });
  return { token, expiraEm, expiraSessao: expira_em };
};

const exigirSessao = async (req, res, next) => {
  try {
    const token = doCabecalho(req.headers.authorization);
    const payload = verificar(token);
    if (!payload) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
    const sessao = await repo.sessaoAtiva(payload.sid);
    if (!sessao) return res.status(401).json({ erro: 'Sessão revogada' });
    const conta = await repo.porId(sessao.id_conta);
    if (!conta) return res.status(401).json({ erro: 'Conta não encontrada' });
    req.conta = conta;
    req.sessao = payload;
    return next();
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
};

app.get('/api/saude', async (req, res) => {
  try {
    await repo.porId('00000000-0000-0000-0000-000000000000');
    res.json({ ok: true, banco: 'postgres', jwt: 'HS256' });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: erro.message });
  }
});

app.post('/api/auth/registro', async (req, res) => {
  try {
    const nome = String(req.body?.nome || '').trim();
    const senha = String(req.body?.senha || '');
    const alvo = identidade(req.body?.identificador || req.body?.email || req.body?.celular);
    if (nome.length < 3) return res.status(400).json({ erro: 'Informe o nome completo' });
    if (!alvo) return res.status(400).json({ erro: 'E-mail ou celular com DDD' });
    if (!senhaForte(senha)) return res.status(400).json({ erro: 'Senha de 6 a 72 caracteres' });
    const existente = await repo.porIdentificador(alvo.email || alvo.celular);
    if (existente) return res.status(409).json({ erro: 'Já existe uma conta com esse contato' });
    const conta = await repo.criar({ nome, email: alvo.email, celular: alvo.celular, senhaHash: gerarHash(senha) });
    const sessao = await sessaoDe(conta, req);
    return res.status(201).json({ conta: publica(conta), ...sessao });
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const alvo = identidade(req.body?.identificador || req.body?.email || req.body?.celular);
    const senha = String(req.body?.senha || '');
    if (!alvo || !senha) return res.status(400).json({ erro: 'Informe contato e senha' });
    const conta = await repo.porIdentificador(alvo.email || alvo.celular);
    if (!conta || !conferirSenha(senha, conta.senha_hash)) {
      return res.status(401).json({ erro: 'Contato ou senha não conferem' });
    }
    const sessao = await sessaoDe(conta, req);
    return res.json({ conta: publica(conta), ...sessao });
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

app.get('/api/auth/eu', exigirSessao, (req, res) => {
  res.json({ conta: publica(req.conta), sessao: req.sessao });
});

app.post('/api/auth/sair', exigirSessao, async (req, res) => {
  await repo.revogar(req.sessao.sid);
  res.json({ ok: true });
});

const STATUS_FRONT = {
  recebido: 'novo',
  'em preparo': 'preparo',
  pronto: 'pronto',
  'saiu para entrega': 'rota',
  entregue: 'entregue',
  retirado: 'retirado',
  cancelado: 'cancelado',
};

app.get('/api/pedidos', exigirSessao, async (req, res) => {
  try {
    if (!req.conta.id_cliente) return res.json({ pedidos: [] });
    const linhas = await repo.pedidosDaConta(req.conta.id_cliente);
    const pedidos = linhas.map((p) => ({
      id: `PLG-${p.numero}`,
      numero: p.numero,
      status: STATUS_FRONT[String(p.status).toLowerCase()] || String(p.status).toLowerCase(),
      tipo: String(p.tipo).toLowerCase() === 'entrega' ? 'entrega' : 'retirada',
      cliente: { nome: p.cliente, telefone: req.conta.celular || null },
      endereco: p.logradouro ? `${p.logradouro}, ${p.numero_endereco || 's/n'} — ${p.bairro || ''}`.trim() : null,
      itens: (typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens) || [],
      subtotal: Number(p.subtotal),
      taxa: Number(p.taxa),
      desconto: Number(p.desconto),
      total: Number(p.total),
      criadoEm: new Date(p.criado_em).getTime(),
    }));
    res.json({ pedidos });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.listen(PORTA, () => {
  console.log(`auth: http://127.0.0.1:${PORTA} (JWT HS256, sessão em postgres)`);
});
