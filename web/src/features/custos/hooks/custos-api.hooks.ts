import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { custosService, type Compra, type Conta, type NovaCompraRequest, type NovaContaRequest, type ResumoCustos } from '../../../api/services/custos';

export const custoKeys = {
  all: ['custos'] as const,
  contas: () => [...custoKeys.all, 'contas'] as const,
  compras: () => [...custoKeys.all, 'compras'] as const,
  resumo: () => [...custoKeys.all, 'resumo'] as const,
};

export const useGetContas = (options?: Omit<UseQueryOptions<Conta[], Error>, 'queryKey' | 'queryFn'>): UseQueryResult<Conta[], Error> =>
  useQuery({ queryKey: custoKeys.contas(), queryFn: () => custosService.getContas(), ...options });

export const useGetCompras = (options?: Omit<UseQueryOptions<Compra[], Error>, 'queryKey' | 'queryFn'>): UseQueryResult<Compra[], Error> =>
  useQuery({ queryKey: custoKeys.compras(), queryFn: () => custosService.getCompras(), ...options });

export const useGetResumoCustos = (options?: Omit<UseQueryOptions<ResumoCustos, Error>, 'queryKey' | 'queryFn'>): UseQueryResult<ResumoCustos, Error> =>
  useQuery({ queryKey: custoKeys.resumo(), queryFn: () => custosService.getResumo(), ...options });

export const useCriarConta = (options?: Omit<UseMutationOptions<Conta, Error, NovaContaRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Conta criada' },
    ...options,
    mutationFn: (dados: NovaContaRequest) => custosService.criarConta(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: custoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useAtualizarConta = (
  options?: Omit<UseMutationOptions<Conta, Error, { id: number; body: NovaContaRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Conta atualizada' },
    ...options,
    mutationFn: ({ id, body }: { id: number; body: NovaContaRequest }) => custosService.atualizarConta(id, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: custoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverConta = (options?: Omit<UseMutationOptions<void, Error, number>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Conta removida' },
    ...options,
    mutationFn: (id: number) => custosService.removerConta(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: custoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCriarCompra = (options?: Omit<UseMutationOptions<Compra, Error, NovaCompraRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Compra registrada' },
    ...options,
    mutationFn: (dados: NovaCompraRequest) => custosService.criarCompra(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: custoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
