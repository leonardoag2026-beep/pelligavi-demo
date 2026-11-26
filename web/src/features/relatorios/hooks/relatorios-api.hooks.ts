import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { relatoriosService, type GetRelatorioParams, type Relatorio } from '../../../api/services/relatorios';

export const relatorioKeys = {
  all: ['relatorios'] as const,
  resumo: (params?: GetRelatorioParams) => [...relatorioKeys.all, 'resumo', params] as const,
};

export const useGetRelatorio = (
  params?: GetRelatorioParams,
  options?: Omit<UseQueryOptions<Relatorio, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Relatorio, Error> =>
  useQuery({
    queryKey: relatorioKeys.resumo(params),
    queryFn: () => relatoriosService.getResumo(params),
    staleTime: 1000 * 60,
    ...options,
  });
