export interface Notificacao {
  id: number;
  tipo: 'pedido' | 'estoque' | 'sistema' | 'financeiro';
  titulo: string;
  texto: string | null;
  meta: string | null;
  lida: boolean;
  grupo: string;
  criadaEm: string;
}

export interface NotificacoesResponse {
  dados: Notificacao[];
  naoLidas: number;
}
