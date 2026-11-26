import { css } from '@emotion/css';

interface ContadorPorcoesProps {
  valor: number;
  aoMudar: (novo: number) => void;
  maximo?: number;
}

const contador = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.1rem',
  flex: 'none',
  borderLeft: '1px solid var(--line)',
  paddingLeft: '0.35rem',
});

const botao = css({
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '1px solid var(--line-2)',
  background: '#fff',
  color: 'var(--ink)',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
  font: 'inherit',
  fontSize: '0.9rem',
  ':disabled': { opacity: 0.4, cursor: 'default' },
  ':hover:not(:disabled)': { borderColor: 'var(--ink-3)' },
});

const valorCss = css({
  minWidth: 34,
  textAlign: 'center',
  fontSize: '0.72rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  '@media (max-width: 720px)': { minWidth: 22 },
});

export const ContadorPorcoes: React.FC<ContadorPorcoesProps> = ({ valor, aoMudar, maximo = 99 }) => (
  <div className={contador}>
    <button
      type="button"
      className={botao}
      aria-label="menos uma porção"
      disabled={valor <= 0}
      onClick={() => aoMudar(Math.max(0, valor - 1))}
    >
      −
    </button>
    <span className={valorCss}>{valor}</span>
    <button
      type="button"
      className={botao}
      aria-label="mais uma porção"
      disabled={valor >= maximo}
      onClick={() => aoMudar(Math.min(maximo, valor + 1))}
    >
      +
    </button>
  </div>
);
