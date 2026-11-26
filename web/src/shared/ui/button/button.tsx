import React from 'react';
import { css, cx } from '@emotion/css';

type Variante = 'primary' | 'outline' | 'ghost' | 'danger';
type Tamnho = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamnho;
  carregando?: boolean;
}

const base = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  borderRadius: '999px',
  border: '1px solid transparent',
  fontFamily: 'var(--texto)',
  fontWeight: 600,
  letterSpacing: '0.01em',
  cursor: 'pointer',
  transition: 'background 160ms ease, border-color 160ms ease, transform 120ms ease',
  ':disabled': { opacity: 0.55, cursor: 'not-allowed' },
  ':active:not(:disabled)': { transform: 'translateY(1px)' },
});

const tamanhos: Record<Tamnho, string> = {
  sm: css({ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }),
  md: css({ padding: '0.78rem 1.5rem', fontSize: '0.94rem' }),
};

const variantes: Record<Variante, string> = {
  primary: css({
    background: 'var(--accent)',
    color: '#fff',
    ':hover:not(:disabled)': { background: 'var(--accent-2)' },
  }),
  outline: css({
    background: 'transparent',
    borderColor: 'var(--line-2)',
    color: 'var(--creme)',
    ':hover:not(:disabled)': { borderColor: 'var(--creme)' },
  }),
  ghost: css({
    background: 'transparent',
    color: 'var(--creme)',
    opacity: 0.8,
    ':hover:not(:disabled)': { opacity: 1 },
  }),
  danger: css({
    background: 'transparent',
    borderColor: 'rgba(181, 42, 28, 0.6)',
    color: '#e9a19a',
    ':hover:not(:disabled)': { background: 'rgba(181, 42, 28, 0.12)' },
  }),
};

export const Button: React.FC<ButtonProps> = ({
  variante = 'primary',
  tamanho = 'md',
  carregando = false,
  className,
  children,
  disabled,
  ...resto
}) => (
  <button
    className={cx(base, tamanhos[tamanho], variantes[variante], className)}
    disabled={disabled || carregando}
    {...resto}
  >
    {carregando ? '…' : children}
  </button>
);
