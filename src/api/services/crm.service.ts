import { atual } from '../storage.js';
import { CANAIS, canal as buscarCanal, STATUS_PEDIDO } from '../../shared/config/site.js';
import type { Canal } from '../../shared/config/site.js';
import type { Conversa, Pedido } from '../types.js';
import { listar } from './orders.service.js';
import { reembolsos as listaReembolsos } from './reembolsos.service.js';

const inicioDoDia = (ts: number = Date.now()): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const ativos = (pedidos: Pedido[]): Pedido[] => pedidos.filter((p) => !['cancelado', 'reembolsado'].includes(p.status));

export interface CanalResumo extends Canal {
  pedidos: number;
  total: number;
}

export interface Resumo {
  faturamento: number;
  pedidosHoje: number;
  ticket: number;
  emAndamento: number;
  entregues: number;
  tempoMedio: number;
  canais: CanalResumo[];
  ultimos: Pedido[];
}

export const resumo = (): Resumo => {
  const pedidos = listar();
  const hoje = pedidos.filter((p) => p.criadoEm >= inicioDoDia());
  const vivos = ativos(hoje);
  const faturamento = vivos.reduce((s, p) => s + p.total, 0);
  const ticket = vivos.length ? Math.round(faturamento / vivos.length) : 0;
  const emAndamento = pedidos.filter((p) => ['novo', 'preparo', 'pronto', 'rota'].includes(p.status)).length;
  const entregues = vivos.filter((p) => p.status === 'entregue').length;
  const canais = CANAIS.map((c) => {
    const doCanal = vivos.filter((p) => p.canal === c.id);
    return {
      ...c,
      pedidos: doCanal.length,
      total: doCanal.reduce((s, p) => s + p.total, 0),
    };
  }).sort((a, b) => b.total - a.total);
  return {
    faturamento,
    pedidosHoje: vivos.length,
    ticket,
    emAndamento,
    entregues,
    tempoMedio: 34,
    canais,
    ultimos: pedidos.slice(0, 5),
  };
};

export interface CanalCaixa extends Canal {
  bruto: number;
  taxa: number;
  liquido: number;
  prazo: number;
  pedidos: number;
}

export interface ExtratoItem {
  em: number;
  titulo: string;
  valor: number;
  tipo: string;
}

export interface CaixaResumo {
  disponivel: number;
  aReceber: number;
  taxas: number;
  bruto: number;
  reembolsos: { total: number; quantidade: number };
  porCanal: CanalCaixa[];
  extrato: ExtratoItem[];
}

export const caixa = (): CaixaResumo => {
  const pedidos = listar().filter((p) => p.pagamento?.status === 'pago');
  const hoje = pedidos.filter((p) => p.criadoEm >= inicioDoDia());
  const prazos: Record<string, number> = { site: 1, whatsapp: 1, ifood: 7, '99food': 2 };
  const porCanal: CanalCaixa[] = CANAIS.map((c) => {
    const doCanal = hoje.filter((p) => p.canal === c.id);
    const bruto = doCanal.reduce((s, p) => s + p.total, 0);
    return {
      ...c,
      bruto,
      taxa: Math.round(bruto * c.taxa),
      liquido: bruto - Math.round(bruto * c.taxa),
      prazo: prazos[c.id] ?? 1,
      pedidos: doCanal.length,
    };
  }).filter((c) => c.bruto > 0);

  const disponivel = porCanal
    .filter((c) => c.prazo === 1)
    .reduce((s, c) => s + c.liquido, 0);
  const aReceber = porCanal.filter((c) => c.prazo > 1).reduce((s, c) => s + c.liquido, 0);
  const taxas = porCanal.reduce((s, c) => s + c.taxa, 0);
  const reembolsos = listaReembolsos().filter((r) => r.em >= inicioDoDia());

  const extrato = hoje
    .slice()
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .map((p) => ({
      em: p.criadoEm,
      titulo: `Pedido ${p.id} · ${buscarCanal(p.canal).nome}`,
      valor: p.total,
      tipo: 'venda',
    }));

  return {
    disponivel,
    aReceber,
    taxas,
    bruto: porCanal.reduce((s, c) => s + c.bruto, 0),
    reembolsos: {
      total: reembolsos.reduce((s, r) => s + r.valor, 0),
      quantidade: reembolsos.length,
    },
    porCanal,
    extrato,
  };
};

// conversas vivem no banco (tabela conversa/mensagem) e chegam por carregarConversas();
// o front só guarda a cópia em memória para as telas que já liam de forma síncrona
const CONVERSAS: Conversa[] = [];

const trocar = (lista: Conversa[]): void => {
  CONVERSAS.splice(0, CONVERSAS.length, ...lista);
};

export const carregarConversas = async (): Promise<void> => {
  const resposta = await fetch('/api/crm/conversas', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /crm/conversas: ${resposta.status}`);
  trocar((await resposta.json()) as Conversa[]);
};

export const conversas = (): Conversa[] => CONVERSAS;

export const conversa = (id: string): Conversa | undefined => CONVERSAS.find((c) => c.id === id);

export const responder = (id: string, texto: string): void => {
  const alvo = CONVERSAS.find((c) => c.id === id);
  if (alvo) {
    alvo.naoLidas = 0;
    alvo.status = 'em_atendimento';
    alvo.mensagens.push({ de: 'loja', texto, em: Date.now() });
  }
  void fetch(`/api/crm/conversas/${id}/mensagens`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((atualizada: Conversa | null) => {
      if (!atualizada) return;
      const indice = CONVERSAS.findIndex((c) => c.id === id);
      if (indice >= 0) CONVERSAS[indice] = atualizada;
      window.dispatchEvent(new CustomEvent('forno:estado'));
    })
    .catch(() => undefined);
};

export const marcarLida = (id: string): void => {
  const alvo = CONVERSAS.find((c) => c.id === id);
  if (alvo) alvo.naoLidas = 0;
  void fetch(`/api/crm/conversas/${id}/lida`, { method: 'PATCH', credentials: 'same-origin' }).catch(() => undefined);
};

export const statusHumano = (id: string): string => STATUS_PEDIDO[id]?.nome || id;

export const crmService = {
  resumo,
  caixa,
  conversas,
  conversa,
  responder,
  marcarLida,
  statusHumano,
};
