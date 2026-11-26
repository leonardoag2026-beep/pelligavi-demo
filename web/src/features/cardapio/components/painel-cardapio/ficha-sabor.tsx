import React, { useEffect, useMemo, useState } from 'react';
import { TbPlus, TbTrash } from 'react-icons/tb';
import { PizzaCanvas, type SecaoDaCena } from '../../../montagem/components/pizza-canvas/pizza-canvas';
import { pecasDe } from '../../../../shared/config/pecas';
import type { Ingrediente } from '../../../../api/services/ingredientes';
import type { SalvarSaborRequest } from '../../../../api/services/cardapio';

interface Linha {
  id: string;
  porcoes: number;
  gramas: number;
}

interface Props {
  sabor: { id: string; nome: string; ativo: boolean; precos: Record<string, number>; receita: Linha[] };
  ingredientes: Ingrediente[];
  tamanhos: { id: string; nome: string }[];
  salvando: boolean;
  novo: boolean;
  onSalvar: (dados: SalvarSaborRequest) => void;
  onExcluir?: () => void;
}

const FATOR_M = 1.35;

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace('.', ',');
const centavos = (texto: string) => Math.max(0, Math.round(Number(texto.replace(',', '.')) * 100) || 0);

// A prévia é a mesma pizza do estúdio: forja real, com a receita desta ficha.
const PreviaSabor: React.FC<{ receita: Linha[]; classes: Map<string, string> }> = ({ receita, classes }) => {
  const secoes = useMemo<SecaoDaCena[][]>(() => {
    const itens = receita
      .filter((item) => item.id && item.porcoes > 0)
      .map((item) => {
        const classe = classes.get(item.id) ?? '';
        const rodela = classe === 'rodela' || classe === 'rodelas';
        const porcao = rodela ? pecasDe(item.id) : Math.round(pecasDe(item.id) * FATOR_M);
        return { nome: item.id, qtd: porcao * item.porcoes };
      });
    return [itens];
  }, [receita, classes]);

  const assinatura = JSON.stringify(secoes);

  return (
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
      <span className="campo-rotulo" style={{ display: 'block', marginBottom: '0.3rem' }}>
        prévia na pizza
      </span>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--linha)' }}>
        <PizzaCanvas
          key={assinatura}
          tamanhoId="m"
          partes={1}
          bordaId="tradicional"
          mostrarRecheio={false}
          secoes={secoes}
          girar={false}
          animarEntrada
          altura={160}
        />
      </div>
    </div>
  );
};

export const FichaSabor: React.FC<Props> = ({ sabor, ingredientes, tamanhos, salvando, novo, onSalvar, onExcluir }) => {
  const [nome, setNome] = useState(sabor.nome);
  const [ativo, setAtivo] = useState(sabor.ativo);
  const precosDe = (precosSabor: Record<string, number>) =>
    Object.fromEntries(tamanhos.map((t) => [t.id, reais(precosSabor[t.id] ?? 0)]));

  const [precos, setPrecos] = useState<Record<string, string>>(() => precosDe(sabor.precos));
  const [receita, setReceita] = useState<Linha[]>(sabor.receita.length ? sabor.receita : []);

  useEffect(() => {
    setNome(sabor.nome);
    setAtivo(sabor.ativo);
    setPrecos(precosDe(sabor.precos));
    setReceita(sabor.receita);
  }, [sabor]);

  const classes = useMemo(() => new Map(ingredientes.map((i) => [i.id, String(i.classe ?? '').toLowerCase()])), [ingredientes]);
  const nomeDe = useMemo(() => new Map(ingredientes.map((i) => [i.id, i.nome])), [ingredientes]);
  const gramasDe = useMemo(() => new Map(ingredientes.map((i) => [i.id, i.gramas ?? 0])), [ingredientes]);

  const usados = new Set(receita.map((r) => r.id));
  const livres = ingredientes.filter((i) => !usados.has(i.id));

  const trocarIngrediente = (indice: number, id: string) => {
    setReceita((atual) =>
      atual.map((linha, pos) =>
        pos === indice
          ? { ...linha, id, gramas: linha.gramas || gramasDe.get(id) || 40 }
          : linha,
      ),
    );
  };

  const adicionar = () => {
    const proximo = livres[0];
    if (!proximo) return;
    setReceita((atual) => [...atual, { id: proximo.id, porcoes: 1, gramas: proximo.gramas ?? 40 }]);
  };

  const pesoTotal = receita.reduce((soma, linha) => soma + (linha.gramas || 0), 0);

  const enviar = () => {
    onSalvar({
      nome: nome.trim(),
      ativo,
      precos: Object.fromEntries(tamanhos.map((t) => [t.id, centavos(precos[t.id] ?? '0')])),
      receita: receita.filter((l) => l.id).map((l) => ({ id: l.id, gramas: Math.max(1, l.gramas), porcoes: Math.max(0, l.porcoes) })),
    });
  };

  return (
    <div className="pedido-detalhe">
      <PreviaSabor receita={receita} classes={classes} />

      <div className="campo-grupo" style={{ padding: '0.8rem 0 0.2rem' }}>
        <label className="campo-rotulo" htmlFor="sabor-nome">
          Nome do sabor
        </label>
        <input
          id="sabor-nome"
          className="campo"
          value={nome}
          placeholder="Ex.: Calabresa especial"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="campo-grupo__linha campo-grupo">
        <label className="campo-rotulo" htmlFor="sabor-ativo">
          Disponível no cardápio
        </label>
        <select id="sabor-ativo" className="campo" value={ativo ? 'sim' : 'nao'} onChange={(e) => setAtivo(e.target.value === 'sim')}>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      {tamanhos.map((t) => (
        <div key={t.id} className="campo-grupo__linha campo-grupo">
          <label className="campo-rotulo" htmlFor={`sabor-preco-${t.id}`}>
            Preço {t.nome}
          </label>
          <input
            id={`sabor-preco-${t.id}`}
            className="campo campo--preco"
            inputMode="decimal"
            style={{ width: '7.5rem', alignSelf: 'flex-end', textAlign: 'right' }}
            value={precos[t.id] ?? ''}
            onChange={(e) => setPrecos((atual) => ({ ...atual, [t.id]: e.target.value }))}
          />
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '1.1rem 0 0.4rem' }}>
        <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Ingredientes da receita</h3>
        <span className="nota">{receita.length} itens · {pesoTotal} g</span>
      </div>

      {receita.length === 0 && (
        <p className="nota" style={{ margin: '0 0 0.6rem' }}>
          Nenhum ingrediente. Adicione o primeiro abaixo.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 4.6rem 5.2rem 2.4rem', gap: '0.45rem', marginBottom: '0.1rem' }}>
        <span className="nota">ingrediente</span>
        <span className="nota">porções</span>
        <span className="nota">gramas</span>
        <span />
      </div>

      {receita.map((linha, indice) => (
        <div
          key={`${linha.id}-${indice}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 4.6rem 5.2rem 2.4rem',
            gap: '0.45rem',
            alignItems: 'center',
            marginBottom: '0.45rem',
          }}
        >
          <select
            className="campo"
            value={linha.id}
            aria-label={`Ingrediente ${indice + 1}`}
            onChange={(e) => trocarIngrediente(indice, e.target.value)}
          >
            {linha.id && !nomeDe.get(linha.id) && <option value={linha.id}>{linha.id}</option>}
            {ingredientes.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.nome}
              </option>
            ))}
          </select>
          <input
            className="campo"
            inputMode="numeric"
            aria-label="Porções"
            title="Porções"
            value={linha.porcoes}
            onChange={(e) =>
              setReceita((atual) =>
                atual.map((l, pos) => (pos === indice ? { ...l, porcoes: Math.max(0, Number(e.target.value) || 0) } : l)),
              )
            }
          />
          <input
            className="campo"
            inputMode="numeric"
            aria-label="Gramas"
            title="Gramas"
            value={linha.gramas}
            onChange={(e) =>
              setReceita((atual) =>
                atual.map((l, pos) => (pos === indice ? { ...l, gramas: Math.max(0, Number(e.target.value) || 0) } : l)),
              )
            }
          />
          <button
            type="button"
            className="icone-botao"
            aria-label={`Remover ${nomeDe.get(linha.id) ?? linha.id}`}
            onClick={() => setReceita((atual) => atual.filter((_, pos) => pos !== indice))}
          >
            <TbTrash size={18} />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="botao botao--mini"
        onClick={adicionar}
        disabled={livres.length === 0}
        style={{ marginTop: '0.5rem', alignSelf: 'flex-start', width: 'auto' }}
      >
        <TbPlus size={16} /> Adicionar ingrediente
      </button>

      <div className="pedido-detalhe__acoes" style={{ marginTop: '1.2rem' }}>
        <button
          type="button"
          className="botao botao--primario botao--mini"
          onClick={enviar}
          disabled={salvando || nome.trim().length < 2 || receita.length === 0}
        >
          {salvando ? 'Salvando…' : novo ? 'Criar sabor' : 'Salvar sabor'}
        </button>
        {!novo && onExcluir ? (
          <button type="button" className="botao botao--perigo botao--mini" onClick={onExcluir}>
            Excluir sabor
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default FichaSabor;
