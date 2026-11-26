import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { crmService, type Conversa, type EnviarMensagemRequest } from '../../../api/services/crm';

export const conversaKeys = {
  all: ['crm'] as const,
  lists: () => [...conversaKeys.all, 'list'] as const,
  list: () => [...conversaKeys.lists()] as const,
  details: () => [...conversaKeys.all, 'detail'] as const,
  detail: (codigo: string) => [...conversaKeys.details(), codigo] as const,
};

export const useGetConversas = (options?: Omit<UseQueryOptions<Conversa[], Error>, 'queryKey' | 'queryFn'>): UseQueryResult<Conversa[], Error> =>
  useQuery({ queryKey: conversaKeys.list(), queryFn: () => crmService.getConversas(), refetchInterval: 10_000, refetchOnWindowFocus: true, ...options });

export const useEnviarMensagem = (
  options?: Omit<UseMutationOptions<Conversa, Error, { codigo: string; body: EnviarMensagemRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Mensagem enviada' },
    ...options,
    mutationFn: ({ codigo, body }: { codigo: string; body: EnviarMensagemRequest }) => crmService.enviarMensagem(codigo, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: conversaKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useResolverConversa = (options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Conversa resolvida' },
    ...options,
    mutationFn: (codigo: string) => crmService.resolver(codigo),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: conversaKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
