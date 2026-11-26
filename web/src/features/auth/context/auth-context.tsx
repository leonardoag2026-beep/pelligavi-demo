import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type Gerente } from '../../../api/services/auth';

interface AuthContextValue {
  gerente: Gerente | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  entrarComCodigo: (email: string, codigo: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const authKeys = {
  sessao: ['auth', 'gerente'] as const,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [entrando, setEntrando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: authKeys.sessao,
    queryFn: () => authService.sessaoGerente(),
    retry: false,
    staleTime: 1000 * 60 * 10,
    throwOnError: false,
  });

  const entrar = useCallback(
    async (email: string, senha: string) => {
      setEntrando(true);
      try {
        const sessao = await authService.loginGerente({ email, senha });
        queryClient.setQueryData(authKeys.sessao, { gerente: sessao.gerente });
      } finally {
        setEntrando(false);
      }
    },
    [queryClient]
  );

  // login sem senha: o servidor emite um código (mock) e o cookie x-token vem na resposta
  const entrarComCodigo = useCallback(
    async (email: string, codigo: string) => {
      setEntrando(true);
      try {
        const sessao = await authService.loginGerenteCodigo(email, codigo);
        queryClient.setQueryData(authKeys.sessao, { gerente: sessao.gerente });
      } finally {
        setEntrando(false);
      }
    },
    [queryClient]
  );

  const sair = useCallback(async () => {
    await authService.sairGerente();
    queryClient.setQueryData(authKeys.sessao, null);
    queryClient.clear();
  }, [queryClient]);

  const valor = useMemo<AuthContextValue>(
    () => ({ gerente: data?.gerente ?? null, carregando: isLoading || entrando, entrar, entrarComCodigo, sair }),
    [data, isLoading, entrando, entrar, entrarComCodigo, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return contexto;
};
