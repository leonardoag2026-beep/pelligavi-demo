import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { caixaService, type AbrirCaixaRequest, type CaixaEstado, type Fechamento, type FecharCaixaRequest } from '../../../api/services/caixa';

export const caixaKeys = {
  all: ['caixa'] as const,
  estado: () => [...caixaKeys.all, 'estado'] as const,
};

export const useGetCaixa = (options?: Omit<UseQueryOptions<CaixaEstado, Error>, 'queryKey' | 'queryFn'>): UseQueryResult<CaixaEstado, Error> =>
  useQuery({ queryKey: caixaKeys.estado(), queryFn: () => caixaService.getEstado(), ...options });

export const useAbrirCaixa = (options?: Omit<UseMutationOptions<CaixaEstado, Error, AbrirCaixaRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Caixa aberto' },
    ...options,
    mutationFn: (dados: AbrirCaixaRequest) => caixaService.abrir(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: caixaKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useFecharCaixa = (options?: Omit<UseMutationOptions<Fechamento, Error, FecharCaixaRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Caixa fechado' },
    ...options,
    mutationFn: (dados: FecharCaixaRequest) => caixaService.fechar(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: caixaKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
