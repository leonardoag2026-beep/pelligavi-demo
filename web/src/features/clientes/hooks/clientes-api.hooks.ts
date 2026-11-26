import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { clientesService, type Cliente, type SalvarClienteRequest } from '../../../api/services/clientes';

export const clienteKeys = {
  all: ['clientes'] as const,
  lists: () => [...clienteKeys.all, 'list'] as const,
  list: (busca?: string) => [...clienteKeys.lists(), busca ?? ''] as const,
  details: () => [...clienteKeys.all, 'detail'] as const,
  detail: (id: string) => [...clienteKeys.details(), id] as const,
};

export const useGetClientes = (
  busca?: string,
  options?: Omit<UseQueryOptions<Cliente[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Cliente[], Error> =>
  useQuery({
    queryKey: clienteKeys.list(busca),
    queryFn: () => clientesService.getClientes(busca),
    ...options,
  });

export const useCriarCliente = (
  options?: Omit<UseMutationOptions<Cliente, Error, SalvarClienteRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (dados: SalvarClienteRequest) => clientesService.criar(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: clienteKeys.lists(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useAnonimizarCliente = (
  options?: Omit<UseMutationOptions<Cliente, Error, string>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => clientesService.anonimizar(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: clienteKeys.lists(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
