export interface Site {
  nome: string;
  segmento: string;
  endereco: string;
  cidade: string;
  aberto: string;
  telefone: string;
  whatsapp: string;
  taxaEntrega: number;
  entregaGratisAcima: number;
  tempoEntrega: string;
  tempoRetirada: string;
  geo: { lat: number; lng: number };
  raioEntregaKm: number;
  pix: { recebedor: string; banco: string; cidade: string };
}

export interface Canal {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  taxa: number;
}

export interface StatusInfo {
  id: string;
  nome: string;
  proximo: string | null;
}

export const SITE: Site = {
  nome: 'Pelligavi',
  segmento: 'Pizzaria napolitana',
  endereco: 'Rua Harmonia, 512 — Vila Madalena',
  cidade: 'São Paulo, SP',
  aberto: 'Aberto até 23h30',
  telefone: '(11) 98765-4321',
  whatsapp: '5511987654321',
  taxaEntrega: 890,
  entregaGratisAcima: 9000,
  tempoEntrega: '35 a 45 min',
  tempoRetirada: '20 min',
  geo: { lat: -23.5553, lng: -46.688 },
  raioEntregaKm: 10,
  pix: { recebedor: 'PELLIGAVI', banco: 'Banco do Brasil', cidade: 'SAO PAULO' },
};

export const INGREDIENTES: string[] = [
  'Mussarela de búfala',
  'Pepperoni',
  'Calabresa fatiada',
  'Bacon',
  'Catupiry',
  'Parmesão',
  'Rúcula',
  'Basílico',
  'Tomate seco',
  'Cebola roxa',
  'Azeitona preta',
  'Abobrinha',
];

export const CANAIS: Canal[] = [
  { id: 'site', nome: 'Site', sigla: 'SITE', cor: '#c8452d', taxa: 0.035 },
  { id: 'whatsapp', nome: 'WhatsApp', sigla: 'WHATS', cor: '#4a7a55', taxa: 0 },
  { id: 'ifood', nome: 'iFood', sigla: 'IFOOD', cor: '#ea1d2c', taxa: 0.27 },
  { id: '99food', nome: '99Food', sigla: '99FOOD', cor: '#f0a800', taxa: 0.23 },
];

export const canal = (id: string): Canal => CANAIS.find((c) => c.id === id) || CANAIS[0]!;

export const STATUS_PEDIDO: Record<string, StatusInfo> = {
  novo: { id: 'novo', nome: 'Novo', proximo: 'preparo' },
  preparo: { id: 'preparo', nome: 'Em preparo', proximo: 'pronto' },
  pronto: { id: 'pronto', nome: 'Pronto', proximo: 'rota' },
  rota: { id: 'rota', nome: 'Em rota', proximo: 'entregue' },
  entregue: { id: 'entregue', nome: 'Entregue', proximo: null },
  retirado: { id: 'retirado', nome: 'Retirado', proximo: null },
  cancelado: { id: 'cancelado', nome: 'Cancelado', proximo: null },
  reembolsado: { id: 'reembolsado', nome: 'Reembolsado', proximo: null },
};
