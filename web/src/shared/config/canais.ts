export interface Canal {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  taxa: number;
}

export const CANAIS: Canal[] = [
  { id: 'site', nome: 'Site', sigla: 'SITE', cor: '#c8452d', taxa: 0.035 },
  { id: 'whatsapp', nome: 'WhatsApp', sigla: 'WHATS', cor: '#4a7a55', taxa: 0 },
  { id: 'ifood', nome: 'iFood', sigla: 'IFOOD', cor: '#ea1d2c', taxa: 0.27 },
  { id: '99food', nome: '99Food', sigla: '99FOOD', cor: '#f0a800', taxa: 0.23 },
  { id: 'telefone', nome: 'Telefone', sigla: 'TEL', cor: '#8b857c', taxa: 0 },
  { id: 'balcao', nome: 'Balcão', sigla: 'BALCAO', cor: '#b7b1a7', taxa: 0 },
];

export const canal = (id: string): Canal => CANAIS.find((c) => c.id === id) ?? CANAIS[0]!;

export const STATUS_PEDIDO: Record<string, { id: string; nome: string }> = {
  novo: { id: 'novo', nome: 'Novo' },
  recebido: { id: 'recebido', nome: 'Recebido' },
  preparo: { id: 'preparo', nome: 'Em preparo' },
  pronto: { id: 'pronto', nome: 'Pronto' },
  rota: { id: 'rota', nome: 'Em rota' },
  entregue: { id: 'entregue', nome: 'Entregue' },
  retirado: { id: 'retirado', nome: 'Retirado' },
  cancelado: { id: 'cancelado', nome: 'Cancelado' },
  reembolsado: { id: 'reembolsado', nome: 'Reembolsado' },
};
