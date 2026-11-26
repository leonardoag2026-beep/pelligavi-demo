import api from '../../axiosInstance';
import type { AlterarStatusRequest, CriarPedidoRequest, ItemPedidoEntrada, Orcamento, Pedido } from './types';

export const pedidosService = {
  getPedidos: async (): Promise<Pedido[]> => {
    const response = await api.get<Pedido[]>('/api/pedidos');
    return response.data;
  },

  getPedidoByNumero: async (numero: number): Promise<Pedido> => {
    const response = await api.get<Pedido>(`/api/pedidos/${numero}`);
    return response.data;
  },

  // preço de tela: mesma conta do servidor, sem gravar pedido
  orcamento: async (itens: ItemPedidoEntrada[], tipo: string): Promise<Orcamento> => {
    const { data } = await api.post<Orcamento>('/api/pedidos/orcamento', { itens, tipo });
    return data;
  },

  criar: async (body: CriarPedidoRequest): Promise<Pedido> => {
    const response = await api.post<Pedido>('/api/pedidos', body);
    return response.data;
  },

  alterarStatus: async (numero: number, body: AlterarStatusRequest): Promise<Pedido> => {
    const response = await api.patch<Pedido>(`/api/pedidos/${numero}/status`, body);
    return response.data;
  },
};

export default pedidosService;
