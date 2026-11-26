import React, { useEffect, useMemo, useState } from 'react';
import { PizzaCanvas, type SecaoDaCena } from '../../../montagem/components/pizza-canvas/pizza-canvas';
import { ajustarRender } from '../../../../shared/config/ingredientes';
import { pecasDe } from '../../../../shared/config/pecas';

interface Props {
  id: string;
  params: Record<string, any>;
  classe?: string;
}

const FATOR_MEDIO = 1.35;

// A prévia é a pizza da montagem: mesma forja, mesma massa, mesma borda e o mesmo
// contador de peças do estúdio — só que com uma porção do ingrediente em edição.
export const PreviaIngrediente: React.FC<Props> = ({ id, params, classe }) => {
  const [estavel, setEstavel] = useState(params);
  const assinatura = JSON.stringify(params);

  // a forja é recriada quando a receita muda; 500 ms evita recriar a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setEstavel(JSON.parse(assinatura)), 500);
    return () => clearTimeout(t);
  }, [assinatura]);

  // aplica a receita em edição antes da forja ler os parâmetros
  ajustarRender(id, estavel);

  const secoes = useMemo<SecaoDaCena[][]>(() => {
    const rodela = classe === 'rodela' || classe === 'rodelas';
    const qtd = Math.round(rodela ? pecasDe(id) : pecasDe(id) * FATOR_MEDIO);
    return [[{ nome: id, qtd }]];
  }, [id, classe, estavel]);

  return (
    // fica grudada no topo do corpo do modal: o palco acompanha a rolagem
    <div
      style={{
        position: 'sticky',
        top: '-1rem',
        zIndex: 8,
        margin: '-1rem 0 0',
        padding: '1rem 0 0.7rem',
        background: '#171513',
        borderBottom: '1px solid #262320',
        boxShadow: '0 12px 18px -16px rgba(0,0,0,0.95)',
      }}
    >
      <span className="campo-rotulo" style={{ display: 'block', marginBottom: '0.3rem' }}>prévia na pizza</span>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--linha)' }}>
        <PizzaCanvas
          // a classe (deposição) entra na chave: trocar como cai na pizza refaz a cena do zero
          key={`${id}|${classe ?? ''}|${JSON.stringify(estavel)}`}
          tamanhoId="m"
          partes={1}
          bordaId="tradicional"
          mostrarRecheio={false}
          secoes={secoes}
          girar={false}
          animarEntrada
          altura={200}
        />
      </div>
    </div>
  );
};
