import React from 'react';
import { css, cx } from '@emotion/css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string;
  erro?: string;
}

const campo = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
});

const rotuloCss = css({
  fontSize: '0.72rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  opacity: 0.6,
});

const entrada = css({
  padding: '0.72rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--line-2)',
  background: 'var(--campo, #fff)',
  color: 'var(--ink)',
  fontFamily: 'var(--texto)',
  fontSize: '0.92rem',
  ':focus': { outline: '2px solid var(--accent)', outlineOffset: '1px' },
});

const erroCss = css({ fontSize: '0.75rem', color: 'var(--perigo)' });

export const Input: React.FC<InputProps> = ({ rotulo, erro, className, id, ...resto }) => (
  <label className={cx(campo, className)} htmlFor={id}>
    {rotulo && <span className={rotuloCss}>{rotulo}</span>}
    <input id={id} className={entrada} {...resto} />
    {erro && <span className={erroCss}>{erro}</span>}
  </label>
);
