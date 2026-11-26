import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import {
  cardapioService,
  type BebidaRequest,
  type Cardapio,
  type CriarTamanhoRequest,
  type PrecoRequest,
  type SalvarSaborRequest,
  type SaborDetalhe,
  type TamanhoRequest,
} from '../../../api/services/cardapio';

export const cardapioKeys = {
  all: ['cardapio'] as const,
  cardapio: () => [...cardapioKeys.all, 'atual'] as const,
};

export const useGetCardapio = (
  options?: Omit<UseQueryOptions<Cardapio, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Cardapio, Error> =>
  useQuery({
    queryKey: cardapioKeys.cardapio(),
    queryFn: () => cardapioService.getCardapio(),
    staleTime: 1000 * 60 * 2,
    ...options,
  });

export const useSabor = (
  slug: string | null,
  options?: Omit<UseQueryOptions<SaborDetalhe>, 'queryKey' | 'queryFn'>
) =>
  useQuery({
    queryKey: [...cardapioKeys.all, 'sabor', slug] as const,
    queryFn: () => cardapioService.sabor(String(slug)),
    enabled: Boolean(slug) && slug !== '__novo',
    staleTime: 0,
    ...options,
  });

export const useSalvarSabor = (
  options?: Omit<UseMutationOptions<SaborDetalhe, Error, { slug: string; body: SalvarSaborRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Sabor salvo' },
    ...options,
    mutationFn: ({ slug, body }: { slug: string; body: SalvarSaborRequest }) => cardapioService.salvarSabor(slug, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverSabor = (options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Sabor excluído' },
    ...options,
    mutationFn: (slug: string) => cardapioService.removerSabor(slug),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCriarSabor = (
  options?: Omit<UseMutationOptions<{ id: number; slug: string }, Error, SalvarSaborRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Sabor criado' },
    ...options,
    mutationFn: (body: SalvarSaborRequest) => cardapioService.criarSabor(body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useSalvarPreco = (
  options?: Omit<UseMutationOptions<void, Error, { slug: string; body: PrecoRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Preço atualizado' },
    ...options,
    mutationFn: ({ slug, body }: { slug: string; body: PrecoRequest }) => cardapioService.salvarPreco(slug, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useSalvarTamanho = (
  options?: Omit<UseMutationOptions<void, Error, { slug: string; body: TamanhoRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Tamanho atualizado' },
    ...options,
    mutationFn: ({ slug, body }: { slug: string; body: TamanhoRequest }) => cardapioService.salvarTamanho(slug, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCriarTamanho = (options?: Omit<UseMutationOptions<{ id: string; nome: string }, Error, CriarTamanhoRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Tamanho criado' },
    ...options,
    mutationFn: (body: CriarTamanhoRequest) => cardapioService.criarTamanho(body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverTamanho = (options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Tamanho excluído' },
    ...options,
    mutationFn: (slug: string) => cardapioService.removerTamanho(slug),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCriarBebida = (options?: Omit<UseMutationOptions<{ id: string; nome: string }, Error, BebidaRequest>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Bebida criada' },
    ...options,
    mutationFn: (body: BebidaRequest) => cardapioService.criarBebida(body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useSalvarBebida = (options?: Omit<UseMutationOptions<{ id: string; nome: string }, Error, { slug: string; body: BebidaRequest }>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Bebida salva' },
    ...options,
    mutationFn: ({ slug, body }: { slug: string; body: BebidaRequest }) => cardapioService.salvarBebida(slug, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverBebida = (options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Bebida excluída' },
    ...options,
    mutationFn: (slug: string) => cardapioService.removerBebida(slug),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useEnviarImagemBebida = (
  options?: UseMutationOptions<{ url: string }, Error, { slug: string; nome: string; base64: string }>
) => {
  const cliente = useQueryClient();
  return useMutation({
    meta: { aviso: 'Imagem da bebida enviada' },
    mutationFn: ({ slug, nome, base64 }: { slug: string; nome: string; base64: string }) =>
      cardapioService.enviarImagemBebida(slug, nome, base64),
    onSuccess: (...args) => {
      void cliente.invalidateQueries({ queryKey: cardapioKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
};
