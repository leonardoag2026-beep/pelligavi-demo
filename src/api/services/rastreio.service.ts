export interface PedidoDaSessao {
  numero: number;
  id: string;
  total: number;
  tipo: string;
  status: string;
  criadoEm: number;
}

const cabecalho = (comCorpo: boolean) =>
  comCorpo ? { 'Content-Type': 'application/json' } : undefined;

export const abrirSessao = async (): Promise<boolean> => {
  try {
    const resposta = await fetch('/api/sessao', { method: 'POST', credentials: 'same-origin' });
    return resposta.ok;
  } catch {
    return false;
  }
};

export const guardarPedido = async (pedido: {
  numero: number;
  id: string;
  total?: number;
  tipo?: string;
  status?: string;
}): Promise<boolean> => {
  try {
    const enviar = async () => fetch('/api/pedidos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: cabecalho(true),
      body: JSON.stringify(pedido),
    });
    let resposta = await enviar();
    if (resposta.status === 401) {
      await abrirSessao();
      resposta = await enviar();
    }
    return resposta.ok;
  } catch {
    return false;
  }
};

export const pedidosDaSessao = async (): Promise<PedidoDaSessao[] | null> => {
  try {
    const resposta = await fetch('/api/pedidos', { credentials: 'same-origin' });
    if (resposta.status === 401) return [];
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return Array.isArray(dados?.pedidos) ? dados.pedidos : [];
  } catch {
    return null;
  }
};

export const atualizarStatus = (numero: number, status: string): void => {
  void fetch(`/api/pedidos/${numero}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: cabecalho(true),
    body: JSON.stringify({ status }),
  }).catch(() => void 0);
};
