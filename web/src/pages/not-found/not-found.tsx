import { css } from '@emotion/css';
import { Link } from 'react-router-dom';

const caixa = css({
  margin: 'auto',
  padding: '4rem 1rem',
  textAlign: 'center',
  display: 'grid',
  gap: '0.75rem',
});

const NotFound: React.FC = () => (
  <main className={caixa}>
    <h1 style={{ fontSize: '3rem' }}>404</h1>
    <p style={{ opacity: 0.65 }}>Essa página não existe no cardápio.</p>
    <Link to="/" style={{ color: 'var(--accent)' }}>
      voltar para a loja
    </Link>
  </main>
);

export default NotFound;
