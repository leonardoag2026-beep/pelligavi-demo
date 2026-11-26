import { useQuery } from '@tanstack/react-query';
import { authService } from '../../../api/services/auth';

/**
 * Sessão do cliente na loja. 401 é resposta normal (visita deslogada), então o erro é
 * engolido e o valor vira null — quem chama só precisa saber se está logado.
 */
export const useSessaoCliente = () =>
  useQuery({
    queryKey: ['sessao-cliente'],
    queryFn: () => authService.sessaoCliente().catch(() => null),
    staleTime: 60_000,
    retry: false,
  });
