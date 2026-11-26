import { lazy, Suspense } from 'react';
import { Navigate, Route as ReactRouterRoute, Routes as ReactRouterRoutes } from 'react-router-dom';
import { SiteLayout } from './shared/components/site-layout/site-layout';
import { CheckoutLayout } from './features/checkout/components/checkout-layout/checkout-layout';
import { LoggedManagerRoute } from './shared/components/logged-manager-route/logged-manager-route';
import Home from './pages/home/home';
import Pix from './pages/pix/pix';
import Pedido from './pages/pedido/pedido';
// o motor 3D (three + cannon) só carrega quando alguém abre a montagem
const Montar = lazy(() => import('./pages/montar/montar'));
import Painel from './pages/painel/painel';
import PainelLogin from './pages/painel-login/painel-login';
import NotFound from './pages/not-found/not-found';
import { PainelGeral } from './features/dashboard/components/painel-geral';
import { PainelCozinha } from './features/cozinha/components/painel-cozinha/painel-cozinha';
import { PainelHistorico } from './features/historico/components/painel-historico/painel-historico';
import { PainelCaixa } from './features/caixa/components/painel-caixa/painel-caixa';
import { PainelAnalise } from './features/analise/components/painel-analise/painel-analise';
import { PainelTransacoes } from './features/transacoes/components/painel-transacoes/painel-transacoes';
import { PainelCardapio } from './features/cardapio/components/painel-cardapio/painel-cardapio';
import { PainelConversas } from './features/crm/components/painel-conversas';
import { PainelClientes } from './features/clientes/components/painel-clientes';
import { PainelFuncionarios } from './features/funcionarios/components/painel-funcionarios';
import { PainelCustos } from './features/custos/components/painel-custos';
import { PainelNotificacoes } from './features/notificacoes/components/painel-notificacoes';
import { PainelConfig } from './features/config/components/painel-config';
import Entrar from './pages/entrar/entrar';
import Pedidos from './pages/pedidos/pedidos';

const Routes = () => (
  <ReactRouterRoutes>
    <ReactRouterRoute element={<SiteLayout />}>
      <ReactRouterRoute index element={<Home />} />
      <ReactRouterRoute element={<CheckoutLayout />}>
        <ReactRouterRoute path="/pedido" element={<Pedido />} />
      </ReactRouterRoute>
      <ReactRouterRoute path="/pix/:codigo" element={<Pix />} />
      <ReactRouterRoute path="/entrar" element={<Entrar />} />
      <ReactRouterRoute path="/pedidos" element={<Pedidos />} />
    </ReactRouterRoute>

    <ReactRouterRoute
      path="/montar"
      element={
        <Suspense fallback={<p style={{ padding: '3rem', opacity: 0.6 }}>Preparando a mesa…</p>}>
          <Montar />
        </Suspense>
      }
    />

    <ReactRouterRoute path="/painel/entrar" element={<PainelLogin />} />

    <ReactRouterRoute element={<LoggedManagerRoute />}>
      <ReactRouterRoute path="/painel" element={<Painel />}>
        <ReactRouterRoute index element={<PainelGeral />} />
        {/* a aba Pedidos foi fundida no Histórico; link antigo cai lá */}
        <ReactRouterRoute path="pedidos" element={<Navigate to="/painel/historico" replace />} />
        <ReactRouterRoute path="cozinha" element={<PainelCozinha />} />
        <ReactRouterRoute path="historico" element={<PainelHistorico />} />
        <ReactRouterRoute path="caixa" element={<PainelCaixa />} />
        <ReactRouterRoute path="analise" element={<PainelAnalise />} />
        <ReactRouterRoute path="transacoes" element={<PainelTransacoes />} />
        <ReactRouterRoute path="cardapio" element={<PainelCardapio />} />
        <ReactRouterRoute path="conversas" element={<PainelConversas />} />
        <ReactRouterRoute path="clientes" element={<PainelClientes />} />
        <ReactRouterRoute path="funcionarios" element={<PainelFuncionarios />} />
        <ReactRouterRoute path="custos" element={<PainelCustos />} />
        <ReactRouterRoute path="notificacoes" element={<PainelNotificacoes />} />
        <ReactRouterRoute path="config" element={<PainelConfig />} />
      </ReactRouterRoute>
    </ReactRouterRoute>

    <ReactRouterRoute path="*" element={<NotFound />} />
  </ReactRouterRoutes>
);

export default Routes;
