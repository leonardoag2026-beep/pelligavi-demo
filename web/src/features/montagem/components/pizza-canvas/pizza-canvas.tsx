import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { criarForja } from '../../../../shared/lib/pizza3d';
import { useMotor3d } from '../../hooks/motor3d.hook';

export interface SecaoDaCena {
  nome: string;
  qtd: number;
}

interface PizzaCanvasProps {
  tamanhoId: string;
  partes?: number;
  bordaId?: string;
  mostrarRecheio?: boolean;
  secoes: SecaoDaCena[][];
  girar?: boolean;
  /** 'palco' = herói, 'estudio' = montagem, 'livre' = bloco com altura fixa */
  variante?: 'palco' | 'estudio' | 'livre';
  altura?: number;
  /** monta a cena com as peças caindo (usado nas prévias do CRM) */
  animarEntrada?: boolean;
  aoMontar?: () => void;
  /** mostrado quando o WebGL não está disponível */
  fallback?: React.ReactNode;
}

interface Forja {
  atualizar: (novo: unknown) => void;
  definirTamanho: (id: string) => void;
  destruir: () => void;
}

/**
 * O canvas fica SEMPRE absoluto dentro de um pai posicionado: o motor ajusta
 * canvas.width/height a cada ResizeObserver, e sem isso o tamanho em pixels vira
 * layout, o pai cresce, o observer mede de novo — a página cresce para sempre.
 */
const base = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  cursor: 'grab',
  touchAction: 'none',
  ':active': { cursor: 'grabbing' },
});

const livre = css({ position: 'relative', width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden' });

export const PizzaCanvas: React.FC<PizzaCanvasProps> = ({
  tamanhoId,
  partes = 1,
  bordaId = 'tradicional',
  mostrarRecheio = true,
  secoes,
  girar = true,
  variante = 'livre',
  altura = 420,
  animarEntrada = true,
  aoMontar,
  fallback = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const forjaRef = useRef<Forja | null>(null);
  const prontoRef = useRef(false);
  const [semWebgl, setSemWebgl] = useState(false);
  // sem a receita do servidor o motor não monta peça: espera antes de criar a cena
  const { pronto: motor3d } = useMotor3d();

  useEffect(() => {
    if (!motor3d) return undefined;
    let cancelado = false;
    const alvo = canvasRef.current;
    if (!alvo) return undefined;

    void (async () => {
      const instancia = (await criarForja(alvo, { partes, bordaId, secoes, mostrarRecheio, animarEntrada })) as Forja | null;
      if (cancelado) return;
      if (!instancia) {
        setSemWebgl(true);
        return;
      }
      forjaRef.current = instancia;
      instancia.definirTamanho(tamanhoId);
      prontoRef.current = true;
      aoMontar?.();
    })();

    return () => {
      cancelado = true;
      prontoRef.current = false;
      forjaRef.current?.destruir();
      forjaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor3d]);

  useEffect(() => {
    if (!prontoRef.current) return;
    forjaRef.current?.definirTamanho(tamanhoId);
  }, [tamanhoId]);

  useEffect(() => {
    if (!prontoRef.current) return;
    forjaRef.current?.atualizar({ partes, bordaId, secoes, girar, mostrarRecheio });
  }, [partes, bordaId, secoes, girar, mostrarRecheio]);

  const tela = (
    <>
      <canvas ref={canvasRef} className={base} aria-label="Prévia 3D da pizza" style={semWebgl ? { display: 'none' } : undefined} />
      {semWebgl ? fallback : null}
    </>
  );

  if (variante === 'livre') {
    return (
      <div className={livre} style={{ height: altura, position: 'relative' }}>
        {tela}
      </div>
    );
  }

  return <>{tela}</>;
};
