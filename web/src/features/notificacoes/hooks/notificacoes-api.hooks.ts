import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { notificacoesService, type NotificacoesResponse } from '../../../api/services/notificacoes';

export const notificacaoKeys = {
  all: ['notificacoes'] as const,
  list: (limite: number) => [...notificacaoKeys.all, 'list', limite] as const,
};

export const useGetNotificacoes = (
  limite = 40,
  options?: Omit<UseQueryOptions<NotificacoesResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<NotificacoesResponse, Error> =>
  useQuery({
    queryKey: notificacaoKeys.list(limite),
    queryFn: () => notificacoesService.getNotificacoes(limite),
    refetchInterval: 1000 * 60,
    ...options,
  });

export const useMarcarLida = (options?: Omit<UseMutationOptions<void, Error, number>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: number) => notificacoesService.marcarLida(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: notificacaoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useMarcarTodas = (options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: () => notificacoesService.marcarTodas(),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: notificacaoKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
