import { atual, salvar } from '../storage.js';
import type { Conta } from '../types.js';

const API_URL = window.__PELLIGAVI_API__ || '';
const CHAVE_TOKEN = 'pelligavi.token';

const id = (): string => Math.random().toString(36).slice(2, 10);

export const remoto = (): boolean => Boolean(API_URL);

export const token = (): string => {
  try { return localStorage.getItem(CHAVE_TOKEN) || ''; } catch { return ''; }
};

const guardarToken = (valor: string): void => {
  try {
    if (valor) localStorage.setItem(CHAVE_TOKEN, valor);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch { void 0; }
};

interface RespostaApi {
  conta?: Conta;
  token?: string;
  expiraEm?: number;
  erro?: string;
  [chave: string]: any;
}

const chamar = async (caminho: string, { metodo = 'GET', corpo }: { metodo?: string; corpo?: unknown } = {}): Promise<RespostaApi> => {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = (await resposta.json().catch(() => ({}))) as RespostaApi;
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível falar com o servidor');
  return dados;
};

export const contaAtual = (): Conta | null => (atual({ conta: null as Conta | null }).conta) || null;

export interface Credenciais {
  nome?: string;
  identificador: string;
  senha: string;
}

export interface ResultadoConta {
  ok: boolean;
  conta?: Conta;
  erro?: string;
}

export const cadastrar = async ({ nome, identificador, senha }: Credenciais): Promise<ResultadoConta> => {
  if (remoto()) {
    try {
      const { conta, token: novo } = await chamar('/api/auth/registro', {
        metodo: 'POST', corpo: { nome, identificador, senha },
      });
      guardarToken(novo || '');
      salvar((estado) => ({ ...estado, conta: { ...(conta as Conta), criadoEm: conta?.criadoEm || Date.now() } }));
      return { ok: true, conta };
    } catch (erro) {
      return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }
  const alvo = identificador.trim().toLowerCase();
  const existente = (atual({ contas: [] }).contas as Conta[]).find((c) => c.identificador === alvo);
  if (existente) return { ok: false, erro: 'Já existe uma conta com esse contato.' };
  const conta: Conta = { id: id(), nome: (nome || '').trim(), identificador: alvo, senha, criadoEm: Date.now() };
  salvar((estado) => ({ ...estado, conta, contas: [...((estado.contas || []) as Conta[]), conta] }));
  return { ok: true, conta };
};

export const entrar = async ({ identificador, senha }: Credenciais): Promise<ResultadoConta> => {
  if (remoto()) {
    try {
      const { conta, token: novo } = await chamar('/api/auth/login', {
        metodo: 'POST', corpo: { identificador, senha },
      });
      guardarToken(novo || '');
      salvar((estado) => ({ ...estado, conta }));
      return { ok: true, conta };
    } catch (erro) {
      return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }
  const alvo = identificador.trim().toLowerCase();
  const conta = (atual({ contas: [] }).contas as Conta[]).find((c) => c.identificador === alvo && c.senha === senha);
  if (!conta) return { ok: false, erro: 'Contato ou senha não conferem.' };
  salvar((estado) => ({ ...estado, conta }));
  return { ok: true, conta };
};

export const sair = async (): Promise<void> => {
  if (remoto() && token()) {
    try { await chamar('/api/auth/sair', { metodo: 'POST' }); } catch { void 0; }
  }
  guardarToken('');
  salvar((estado) => ({ ...estado, conta: null }));
};

export const identificadorValido = (valor: string): boolean => {
  const limpo = String(valor || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo)) return true;
  return limpo.replace(/\D/g, '').length >= 10;
};

export const accountService = { contaAtual, cadastrar, entrar, sair, identificadorValido, remoto, token };
