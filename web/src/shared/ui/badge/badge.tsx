import React from 'react';
import { css, cx } from '@emotion/css';

type Tom = 'neutro' | 'verde' | 'vermelho' | 'dourado' | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tom?: Tom;
}

const base = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.18rem 0.55rem',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
});

const tons: Record<Tom, string> = {
  neutro: css({ background: 'rgba(20, 20, 15, 0.08)', color: 'var(--ink-2)' }),
  verde: css({ background: 'rgba(28, 138, 78, 0.14)', color: 'var(--verde-2)' }),
  vermelho: css({ background: 'rgba(181, 42, 28, 0.14)', color: 'var(--perigo)' }),
  dourado: css({ background: 'rgba(224, 176, 72, 0.2)', color: '#7a5a12' }),
  accent: css({ background: 'rgba(211, 58, 44, 0.12)', color: 'var(--accent-2)' }),
};

export const Badge: React.FC<BadgeProps> = ({ tom = 'neutro', className, children, ...resto }) => (
  <span className={cx(base, tons[tom], className)} {...resto}>
    {children}
  </span>
);
