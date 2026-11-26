export interface Reembolso {
  id: number;
  valor: number;
  motivo: string;
  pedidoRef: string | null;
  em: number;
}

// reembolsos vivem no banco (tabela reembolso), no módulo pagamentos
const CACHE: Reembolso[] = [];

const doServidor = (bruto: any): Reembolso => ({
  id: bruto.id,
  valor: bruto.valor,
  motivo: bruto.motivo,
  pedidoRef: bruto.pedidoRef ?? null,
  em: new Date(String(bruto.criadoEm).replace(' ', 'T')).getTime(),
});

export const carregarReembolsos = async (): Promise<void> => {
  const resposta = await fetch('/api/pagamentos/reembolsos', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /pagamentos/reembolsos: ${resposta.status}`);
  const corpo = (await resposta.json()) as { dados: any[] };
  CACHE.splice(0, CACHE.length, ...(corpo.dados || []).map(doServidor));
};

export const reembolsos = (): Reembolso[] => CACHE;

export const registrarReembolso = (dados: { valor: number; motivo?: string; pedidoRef?: string | null }): void => {
  const local: Reembolso = {
    id: -Date.now(),
    valor: dados.valor,
    motivo: dados.motivo || 'reembolso manual no painel',
    pedidoRef: dados.pedidoRef ?? null,
    em: Date.now(),
  };
  CACHE.unshift(local);
  void fetch('/api/pagamentos/reembolsos', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: local.valor, motivo: local.motivo, pedidoRef: local.pedidoRef }),
  }).catch(() => undefined);
};
