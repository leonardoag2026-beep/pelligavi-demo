import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import type { SalvarRenderRequest } from '../../../api/services/ingredientes';
import { ingredientesService, type CriarIngredienteRequest, type Geometria, type Ingrediente, type RenderIngrediente } from '../../../api/services/ingredientes';
import { cardapioKeys } from '../../cardapio/hooks/cardapio-api.hooks';

export const ingredienteKeys = {
  all: ['ingredientes'] as const,
  lista: () => [...ingredienteKeys.all, 'list'] as const,
  render: () => [...ingredienteKeys.all, 'render'] as const,
};

export const useGetIngredientes = (
  options?: Omit<UseQueryOptions<Ingrediente[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Ingrediente[], Error> =>
  useQuery({
    queryKey: ingredienteKeys.lista(),
    queryFn: () => ingredientesService.getIngredientes(),
    staleTime: 1000 * 60 * 2,
    ...options,
  });

export const useSalvarPeso = (
  options?: Omit<UseMutationOptions<void, Error, { slug: string; gramas: number; precoKg: number }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Peso salvo' },
    ...options,
    mutationFn: ({ slug, gramas, precoKg }: { slug: string; gramas: number; precoKg: number }) =>
      ingredientesService.salvarPeso(slug, gramas, precoKg),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useEnviarImagem = (
  options?: Omit<UseMutationOptions<{ url: string }, Error, { slug: string; nome: string; base64: string }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Imagem enviada' },
    ...options,
    mutationFn: ({ slug, nome, base64 }: { slug: string; nome: string; base64: string }) =>
      ingredientesService.enviarImagem(slug, nome, base64),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useCriarIngrediente = (
  options?: Omit<UseMutationOptions<{ id: string; nome: string }, Error, CriarIngredienteRequest>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Ingrediente criado' },
    ...options,
    mutationFn: (body: CriarIngredienteRequest) => ingredientesService.criar(body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useRemoverIngrediente = (
  options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Ingrediente excluído' },
    ...options,
    mutationFn: (slug: string) => ingredientesService.remover(slug),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: cardapioKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useSalvarRender = (
  options?: Omit<UseMutationOptions<void, Error, { slug: string; body: SalvarRenderRequest }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Ingrediente salvo' },
    ...options,
    mutationFn: ({ slug, body }: { slug: string; body: SalvarRenderRequest }) => ingredientesService.salvarRender(slug, body),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useDefinirClasse = (
  options?: Omit<UseMutationOptions<void, Error, { slug: string; classe: 'rodela' | 'desfiado' | 'espalhado' | 'fio' }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Como cai na pizza atualizado' },
    ...options,
    mutationFn: ({ slug, classe }: { slug: string; classe: 'rodela' | 'desfiado' | 'espalhado' | 'fio' }) =>
      ingredientesService.definirClasse(slug, classe),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useEnviarTextura = (
  options?: Omit<UseMutationOptions<{ url: string }, Error, { slug: string; nome: string; base64: string }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Textura enviada' },
    ...options,
    mutationFn: ({ slug, nome, base64 }: { slug: string; nome: string; base64: string }) =>
      ingredientesService.enviarTextura(slug, nome, base64),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useEnviarModelo = (
  options?: Omit<UseMutationOptions<{ url: string }, Error, { slug: string; nome: string; base64: string }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { aviso: 'Modelo enviado' },
    ...options,
    mutationFn: ({ slug, nome, base64 }: { slug: string; nome: string; base64: string }) =>
      ingredientesService.enviarModelo(slug, nome, base64),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ingredienteKeys.all, refetchType: 'all' });
      options?.onSuccess?.(...args);
    },
  });
};

export const useGetGeometrias = (
  options?: Omit<UseQueryOptions<Geometria[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Geometria[], Error> =>
  useQuery({
    queryKey: [...ingredienteKeys.all, 'geometrias'] as const,
    queryFn: () => ingredientesService.getGeometrias(),
    staleTime: 1000 * 60 * 10,
    retry: false,
    ...options,
  });

export const useGetRender = (
  options?: Omit<UseQueryOptions<RenderIngrediente[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<RenderIngrediente[], Error> =>
  useQuery({
    queryKey: ingredienteKeys.render(),
    queryFn: () => ingredientesService.getRender(),
    staleTime: 1000 * 60 * 2,
    retry: false,
    ...options,
  });
