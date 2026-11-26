import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { pagamentosService, type Cobranca, type NovaCobrancaRequest, type Reembolso } from '../../../api/services/pagamentos';

export const pagamentoKeys = {
  all: ['pagamentos'] as const,
  cobrancas: () => [...pagamentoKeys.all, 'cobrancas'] as const,
  cobranca: (codigo: string) => [...pagamentoKeys.cobrancas(), codigo] as const,
};

export const useGetCobranca = (
  codigo: string,
  options?: Omit<UseQueryOptions<Cobranca, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Cobranca, Error> =>
  useQuery({
    queryKey: pagamentoKeys.cobranca(codigo),
    queryFn: () => pagamentosService.getCobrancaByCodigo(codigo),
    enabled: Boolean(codigo),
    retry: false,
    ...options,
  });

export const useCriarCobranca = (
  options?: Omit<UseMutationOptions<Cobranca, Error, { codigo: string; body: NovaCobrancaRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: false },
    ...options,
    mutationFn: ({ codigo, body }: { codigo: string; body: NovaCobrancaRequest }) => pagamentosService.criarCobranca(codigo, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: pagamentoKeys.cobrancas(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useGetReembolsos = (
  options?: Omit<UseQueryOptions<{ dados: Reembolso[]; total: number; quantidade: number }, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<{ dados: Reembolso[]; total: number; quantidade: number }, Error> =>
  useQuery({
    queryKey: [...pagamentoKeys.all, 'reembolsos'] as const,
    queryFn: () => pagamentosService.getReembolsos(),
    ...options,
  });

export const usePagarCobranca = (
  options?: Omit<UseMutationOptions<Cobranca, Error, { codigo: string; pedidoRef?: string | null }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: false },
    ...options,
    mutationFn: ({ codigo, pedidoRef }: { codigo: string; pedidoRef?: string | null }) =>
      pagamentosService.pagarCobranca(codigo, { pedidoRef }),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: pagamentoKeys.cobrancas(), refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
