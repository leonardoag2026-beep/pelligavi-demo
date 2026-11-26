export interface ClientePainel {
  id: string;
  nome: string;
  telefone: string | null;
  enderecos: string[];
  criadoEm: number;
  anonimizado: boolean;
  anonimizadoEm?: number;
}

export interface DadosCliente {
  id?: string;
  nome?: string;
  telefone?: string | null;
  enderecos?: string[];
  criadoEm?: number;
}

// clientes vivem no banco (cliente + cliente_endereco_texto) e chegam por carregarClientes()
const CLIENTES: ClientePainel[] = [];

const trocar = (lista: ClientePainel[]): void => {
  CLIENTES.splice(0, CLIENTES.length, ...lista);
};

const doServidor = (bruto: any): ClientePainel => ({
  id: bruto.id,
  nome: bruto.nome,
  telefone: bruto.telefone,
  enderecos: bruto.enderecos || [],
  criadoEm: new Date(bruto.criadoEm).getTime(),
  anonimizado: Boolean(bruto.anonimizado),
});

export const carregarClientes = async (): Promise<void> => {
  const resposta = await fetch('/api/clientes', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /clientes: ${resposta.status}`);
  trocar(((await resposta.json()) as any[]).map(doServidor));
};

const todos = (): ClientePainel[] => CLIENTES;

export const listar = (busca = ''): ClientePainel[] => {
  const lista = todos();
  const termo = busca.trim().toLowerCase();
  if (!termo) return lista;
  const digitos = termo.replace(/\D/g, '');
  return lista.filter((c) => {
    if (c.nome.toLowerCase().includes(termo)) return true;
    if (!c.telefone) return false;
    const tel = c.telefone.replace(/\D/g, '');
    return digitos ? tel.includes(digitos) : c.telefone.toLowerCase().includes(termo);
  });
};

export const buscar = (id: string): ClientePainel | undefined => todos().find((c) => c.id === id);

export const salvarCliente = async (dados: DadosCliente): Promise<ClientePainel> => {
  const nome = (dados.nome || '').trim();
  if (!nome) throw new Error('Nome é obrigatório');
  const enderecos = (dados.enderecos || []).map((e) => e.trim()).filter(Boolean);
  if (!enderecos.length) throw new Error('Informe ao menos um endereço');

  const resposta = await fetch(dados.id ? `/api/clientes/${dados.id}` : '/api/clientes', {
    method: dados.id ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, telefone: (dados.telefone || '').trim() || null, enderecos }),
  });
  if (!resposta.ok) throw new Error(`API /clientes: ${resposta.status}`);
  const salvo = doServidor(await resposta.json());
  const indice = CLIENTES.findIndex((c) => c.id === salvo.id);
  if (indice >= 0) CLIENTES[indice] = salvo;
  else CLIENTES.push(salvo);
  return salvo;
};

export interface ClienteCheckout {
  nome: string;
  telefone?: string | null;
  endereco?: string | null;
}

export const criarDoCheckout = async ({ nome, telefone, endereco }: ClienteCheckout): Promise<ClientePainel> => {
  const resposta = await fetch('/api/clientes/checkout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, telefone: telefone ?? null, endereco: endereco ?? null }),
  });
  if (!resposta.ok) throw new Error(`API /clientes/checkout: ${resposta.status}`);
  const cliente = doServidor(await resposta.json());
  const indice = CLIENTES.findIndex((c) => c.id === cliente.id);
  if (indice >= 0) CLIENTES[indice] = cliente;
  else CLIENTES.push(cliente);
  return cliente;
};

const ROTULO = 'Cliente anonimizado';

export const anonimizar = async (id: string): Promise<ClientePainel> => {
  const resposta = await fetch(`/api/clientes/${id}/anonimizar`, { method: 'PATCH', credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /clientes/${id}/anonimizar: ${resposta.status}`);
  const cliente = doServidor(await resposta.json());
  const indice = CLIENTES.findIndex((c) => c.id === cliente.id);
  if (indice >= 0) CLIENTES[indice] = cliente;
  return cliente;
};

export const total = (): number => CLIENTES.length;
