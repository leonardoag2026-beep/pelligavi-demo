export const API_URL = window.__PELLIGAVI_API__ || '';

export interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  texto: string | null;
  meta: string | null;
  lida: boolean;
  grupo: string;
  quando: number;
}

const base = (): string => API_URL;

// as notificações são gravadas no banco (tabela notificacao, por gatilho de status de pedido)
export const carregar = async (limite = 40): Promise<Notificacao[]> => {
  const resposta = await fetch(`${base()}/api/notificacoes?limite=${limite}`, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /notificacoes: ${resposta.status}`);
  const corpo = (await resposta.json()) as { dados: any[] };
  return (corpo.dados || []).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    texto: n.texto ?? null,
    meta: n.meta ?? null,
    lida: !!n.lida,
    grupo: n.grupo,
    quando: new Date(n.criadaEm.replace(' ', 'T')).getTime(),
  }));
};

export const marcarLida = async (id: number): Promise<void> => {
  await fetch(`${base()}/api/notificacoes/${id}/lida`, {
    method: 'PATCH',
    credentials: 'same-origin',
  });
};

export const marcarTodas = async (): Promise<void> => {
  await fetch(`${base()}/api/notificacoes/todas/lida`, {
    method: 'PATCH',
    credentials: 'same-origin',
  });
};
