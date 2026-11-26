import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  funcionariosService,
  type AtualizarFuncionarioRequest,
  type CriarFuncionarioRequest,
  type Funcionario,
  type FuncionariosResponse,
} from '../../../api/services/funcionarios';

export const funcionarioKeys = {
  all: ['funcionarios'] as const,
  lists: () => [...funcionarioKeys.all, 'list'] as const,
  list: () => [...funcionarioKeys.lists()] as const,
  resumo: () => [...funcionarioKeys.all, 'resumo'] as const,
};

export const useGetFuncionarios = (
  options?: Omit<UseQueryOptions<FuncionariosResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<FuncionariosResponse, Error> =>
  useQuery({
    queryKey: funcionarioKeys.list(),
    queryFn: () => funcionariosService.getFuncionarios(),
    ...options,
  });

export const useCriarFuncionario = (
  options?: Omit<UseMutationOptions<Funcionario, Error, CriarFuncionarioRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Funcionário cadastrado' },
    ...options,
    mutationFn: (dados: CriarFuncionarioRequest) => funcionariosService.criar(dados),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: funcionarioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverFuncionario = (
  options?: Omit<UseMutationOptions<void, Error, number>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Funcionário removido' },
    ...options,
    mutationFn: (id: number) => funcionariosService.remover(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: funcionarioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useAtualizarFuncionario = (
  options?: Omit<UseMutationOptions<Funcionario, Error, { id: number; body: AtualizarFuncionarioRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: ({ id, body }: { id: number; body: AtualizarFuncionarioRequest }) =>
      funcionariosService.atualizar(id, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: funcionarioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};
