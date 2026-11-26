import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  pedidosService,
  type AlterarStatusRequest,
  type CriarPedidoRequest,
  type ItemPedidoEntrada,
  type Pedido,
} from '../../../api/services/pedidos';

export const pedidoKeys = {
  all: ['pedidos'] as const,
  lists: () => [...pedidoKeys.all, 'list'] as const,
  list: () => [...pedidoKeys.lists()] as const,
  details: () => [...pedidoKeys.all, 'detail'] as const,
  detail: (numero: number) => [...pedidoKeys.details(), numero] as const,
};

export const useGetPedidos = (
  options?: Omit<UseQueryOptions<Pedido[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Pedido[], Error> =>
  useQuery({
    queryKey: pedidoKeys.list(),
    queryFn: () => pedidosService.getPedidos(),
    // painel precisa refletir pedido novo mesmo com a aba já aberta
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    ...options,
  });

export const useGetPedido = (
  numero: number,
  options?: Omit<UseQueryOptions<Pedido, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Pedido, Error> =>
  useQuery({
    queryKey: pedidoKeys.detail(numero),
    queryFn: () => pedidosService.getPedidoByNumero(numero),
    enabled: Number.isFinite(numero),
    ...options,
  });

// preço de tela vem do servidor: mesma conta usada para cobrar
export const useOrcamento = (itens: ItemPedidoEntrada[], tipo: string) =>
  useQuery({
    queryKey: ['pedidos', 'orcamento', tipo, JSON.stringify(itens)],
    queryFn: () => pedidosService.orcamento(itens, tipo),
    enabled: itens.length > 0,
    staleTime: 30_000,
  });

export const useCriarPedido = (
  options?: Omit<UseMutationOptions<Pedido, Error, CriarPedidoRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: false },
    ...options,
    mutationFn: (dados: CriarPedidoRequest) => pedidosService.criar(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: pedidoKeys.lists(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useAlterarStatus = (
  options?: Omit<UseMutationOptions<Pedido, Error, { numero: number; body: AlterarStatusRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Status do pedido atualizado' },
    ...options,
    mutationFn: ({ numero, body }: { numero: number; body: AlterarStatusRequest }) =>
      pedidosService.alterarStatus(numero, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: pedidoKeys.lists(), refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: pedidoKeys.details(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
