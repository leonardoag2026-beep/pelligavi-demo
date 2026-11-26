import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './features/auth/context/auth-context';
import Routes from './routes';
import './index.css';
import { instalarCrm } from './shared/styles/crm';

// folha antiga injetada no boot, não no mount de cada página: com injeção por página a
// tela pintava sem estilo por um instante a cada reload (o "css não carregou")
instalarCrm();

// feedback de toda gravação: cada mutação avisa por padrão; `meta.aviso` troca o texto
// (ou desliga com false quando a própria tela já conclui algo)
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_dados, _vars, _ctx, mutacao) => {
      const aviso = (mutacao.options.meta as { aviso?: string | false } | undefined)?.aviso;
      if (aviso === false) return;
      toast.success(typeof aviso === 'string' ? aviso : 'Salvo com sucesso');
    },
    onError: (erro: any) => {
      const texto = erro?.response?.data?.erro ?? erro?.message ?? 'Não deu certo';
      toast.error(String(texto));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <Routes />
          <ToastContainer
            position="top-left"
            autoClose={3000}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            theme="colored"
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
