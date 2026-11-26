import React from 'react';

export type Descritor =
  | { nome: string; rotulo: string; tipo: 'texto'; dica?: string; exemplo?: string }
  | { nome: string; rotulo: string; tipo: 'numero'; min: number; max: number; passo: number; dica?: string }
  | { nome: string; rotulo: string; tipo: 'cor'; dica?: string }
  | { nome: string; rotulo: string; tipo: 'opcao'; opcoes: ReadonlyArray<{ valor: string; rotulo: string }>; dica?: string };

const linha: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 158px)',
  alignItems: 'center',
  gap: '0.7rem',
  minHeight: 44,
  padding: '0.15rem 0',
};

const rotulo: React.CSSProperties = {
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--texto-fraco)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const controle: React.CSSProperties = {
  width: '100%',
  minHeight: 38,
  padding: '0.45rem 0.6rem',
  borderRadius: 8,
  border: '1px solid var(--linha)',
  background: 'var(--superficie-2)',
  color: 'var(--texto)',
  fontSize: '0.82rem',
  fontVariantNumeric: 'tabular-nums',
};

interface Props {
  campo: Descritor;
  valor: string;
  aoMudar: (valor: string) => void;
}

// um controle por tipo de dado: opção fechada, seletor de cor e barra para números
export const CampoDoRender: React.FC<Props> = ({ campo, valor, aoMudar }) => {
  const id = `campo-${campo.nome}`;
  const numero = (v: string, padrao: number) => {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : padrao;
  };

  const conteudo = (() => {
    if (campo.tipo === 'opcao') {
      return (
        <select id={id} style={{ ...controle, padding: '0.45rem 0.5rem' }} value={valor} onChange={(e) => aoMudar(e.target.value)}>
          <option value="">—</option>
          {campo.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </select>
      );
    }

    if (campo.tipo === 'cor') {
      const cor = /^#[0-9a-f]{6}$/i.test(valor) ? valor : '#8a3a25';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id={id}
            type="color"
            value={cor}
            onChange={(e) => aoMudar(e.target.value)}
            style={{ width: 44, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--linha)', background: 'var(--superficie-2)', cursor: 'pointer' }}
          />
          <input
            aria-label={`${campo.rotulo} em hexadecimal`}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            style={{ ...controle, fontFamily: 'ui-monospace, monospace', textTransform: 'lowercase' }}
          />
        </div>
      );
    }

    if (campo.tipo === 'numero') {
      const atual = numero(valor, campo.min);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <input
            id={id}
            type="range"
            min={campo.min}
            max={campo.max}
            step={campo.passo}
            value={Math.min(campo.max, Math.max(campo.min, atual))}
            onChange={(e) => aoMudar(e.target.value)}
            style={{ accentColor: 'var(--accent)', height: 30, flex: '1 1 auto', minWidth: 0 }}
          />
          <input
            aria-label={`${campo.rotulo} (valor)`}
            inputMode="decimal"
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            style={{ ...controle, width: 62, flex: '0 0 auto', minHeight: 34, padding: '0.3rem 0.4rem', textAlign: 'right' }}
          />
        </div>
      );
    }

    return (
      <input
        id={id}
        style={controle}
        placeholder={campo.exemplo ?? ''}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
    );
  })();

  return (
    <div style={linha}>
      <label htmlFor={id} style={rotulo} title={campo.dica ?? campo.rotulo}>
        {campo.rotulo}
      </label>
      {conteudo}
    </div>
  );
};

export const grupo: React.CSSProperties = {
  margin: '0.9rem 0 0.25rem',
  fontSize: '0.62rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--texto-fraco)',
  opacity: 0.75,
};
