export interface Mensagem {
  de: 'cliente' | 'loja';
  texto: string;
  em: number;
  tipo: string;
  anexo: string | null;
}

export interface Conversa {
  id: string;
  canal: string;
  nome: string;
  pedido: string | null;
  status: 'aberta' | 'em_atendimento' | 'resolvida';
  naoLidas: number;
  etapa: string | null;
  mensagens: Mensagem[];
}

export interface EnviarMensagemRequest {
  texto: string;
}
