import { Outlet } from 'react-router-dom';
import { CheckoutProvider } from '../../context/checkout-context';

/** Um pedido só atravessa montagem e pagamento: o estado vive aqui, acima das duas rotas. */
export const CheckoutLayout: React.FC = () => (
  <CheckoutProvider>
    <Outlet />
  </CheckoutProvider>
);
