// Sessão do gerente: o login é validado no servidor (scrypt + JWT em cookie httpOnly).
// O navegador guarda só uma cópia em memória do que a API respondeu — nada de hash local.

export interface Gerente {
  id: number;
  nome: string;
  email: string;
}

export interface SessaoGerente {
  email: string;
  nome: string;
  em: number;
  expiraEm: number;
}

export const CREDENCIAL_PADRAO = { email: 'gerente@pelligavi.com', senha: 'pizzaria2026' };

let SESSAO: SessaoGerente | null = null;

const doServidor = (gerente: Gerente): SessaoGerente => ({
  email: gerente.email,
  nome: gerente.nome,
  em: Date.now(),
  expiraEm: Date.now() + 12 * 3600000,
});

/** Lê a sessão do cookie no boot. Chamar antes de renderizar o painel. */
export const carregarSessao = async (): Promise<void> => {
  try {
    const resposta = await fetch('/api/auth/gerente', { credentials: 'same-origin' });
    if (!resposta.ok) {
      SESSAO = null;
      return;
    }
    const corpo = (await resposta.json()) as { gerente: Gerente };
    SESSAO = corpo?.gerente ? doServidor(corpo.gerente) : null;
  } catch {
    SESSAO = null;
  }
};

export const login = async (email: string, senha: string): Promise<boolean> => {
  const resposta = await fetch('/api/auth/gerente', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
  });
  if (!resposta.ok) return false;
  const corpo = (await resposta.json()) as { gerente: Gerente };
  SESSAO = corpo?.gerente ? doServidor(corpo.gerente) : null;
  return Boolean(SESSAO);
};

export const sessao = (): SessaoGerente | null => {
  if (!SESSAO) return null;
  if (Date.now() > SESSAO.expiraEm) return null;
  return SESSAO;
};

export const logado = (): boolean => Boolean(sessao());

export const sair = async (): Promise<void> => {
  SESSAO = null;
  await fetch('/api/auth/sair', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
};

// compatibilidade: o painel antigo chamava isso antes de abrir o login
export const garantirGerente = async (): Promise<void> => {
  await carregarSessao();
};

export const precisaConfigurar = (): boolean => !SESSAO;

export const criarGerente = async (): Promise<void> => {
  throw new Error('O gerente é cadastrado no banco (tabela gerente), não pelo navegador.');
};

export const trocarSenha = async (_atual: string, _nova: string): Promise<boolean> => {
  throw new Error('Troca de senha do gerente é feita no servidor (ainda não exposta na UI).');
};

export const authService = { login, logado, sair, sessao, garantirGerente, precisaConfigurar, carregarSessao, CREDENCIAL_PADRAO };
