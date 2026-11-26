import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { configService, type AtualizarConfigRequest, type LojaConfig } from '../../../api/services/config';

export const configKeys = {
  all: ['config'] as const,
  atual: () => [...configKeys.all, 'atual'] as const,
};

export const useGetConfig = (options?: Omit<UseQueryOptions<LojaConfig, Error>, 'queryKey' | 'queryFn'>): UseQueryResult<LojaConfig, Error> =>
  useQuery({ queryKey: configKeys.atual(), queryFn: () => configService.getConfig(), ...options });

export const useAtualizarConfig = (options?: Omit<UseMutationOptions<LojaConfig, Error, AtualizarConfigRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Configurações salvas' },
    ...options,
    mutationFn: (dados: AtualizarConfigRequest) => configService.atualizar(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: configKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
