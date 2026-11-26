import React from 'react';
import { css, cx } from '@emotion/css';

interface SectionCardProps extends React.HTMLAttributes<HTMLElement> {
  titulo?: string;
  descricao?: string;
  acao?: React.ReactNode;
  escuro?: boolean;
}

const card = css({
  background: 'var(--card)',
  color: 'var(--ink)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--line)',
  padding: '1.35rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

const cardEscuro = css({
  background: 'var(--bg-2)',
  color: 'var(--creme)',
  borderColor: 'var(--bg-3)',
});

const topo = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
});

const tituloCss = css({
  fontFamily: 'var(--display)',
  fontSize: '1.15rem',
  margin: 0,
});

const descricaoCss = css({
  fontSize: '0.82rem',
  opacity: 0.65,
  marginTop: '0.25rem',
});

export const SectionCard: React.FC<SectionCardProps> = ({
  titulo,
  descricao,
  acao,
  escuro = false,
  className,
  children,
  ...resto
}) => (
  <section className={cx(card, escuro && cardEscuro, className)} {...resto}>
    {(titulo || acao) && (
      <header className={topo}>
        <div>
          {titulo && <h2 className={tituloCss}>{titulo}</h2>}
          {descricao && <p className={descricaoCss}>{descricao}</p>}
        </div>
        {acao}
      </header>
    )}
    {children}
  </section>
);
