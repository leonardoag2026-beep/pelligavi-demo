import { useState } from 'react';
import { useAbrirCaixa, useFecharCaixa, useGetCaixa } from '../../hooks/caixa-api.hooks';
import { brl, dataCurta, horaCurta } from '../../../../shared/utils/format';

export const PainelCaixa: React.FC = () => {
  const { data: caixa } = useGetCaixa();
  const abrir = useAbrirCaixa();
  const fechar = useFecharCaixa();
  const [fundo, setFundo] = useState('200,00');
  const [contado, setContado] = useState('');
  const [observacao, setObservacao] = useState('');

  const numero = (texto: string) => Math.round(Number(texto.replace(',', '.')) * 100);
  const porForma = Object.entries(caixa?.porForma ?? {});

  return (
    <div className="caixa-painel">
      <div className="kpis kpis--caixa">
        <div className="kpi kpi--destaque">
          <span className="kpi__rotulo">Em caixa</span>
          <strong>{brl(caixa?.esperado ?? 0)}</strong>
          <span className="kpi__detalhe">
            {caixa?.aberto ? `aberto em ${horaCurta(caixa.abertaEm ?? Date.now())}` : 'fechado'}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi__rotulo">Vendas no turno</span>
          <strong>{brl(caixa?.total ?? 0)}</strong>
          <span className="kpi__detalhe">{caixa?.pedidos ?? 0} pedido(s)</span>
        </div>
        <div className="kpi">
          <span className="kpi__rotulo">Fundo de troco</span>
          <strong>{brl(caixa?.valorInicial ?? 0)}</strong>
          <span className="kpi__detalhe">dinheiro inicial</span>
        </div>
      </div>

      {caixa?.aberto ? (
        <section className="cartao-painel">
          <div className="cartao-painel__topo">
            <h2>Fechar o caixa</h2>
            <span className="nota">conte o dinheiro e confira</span>
          </div>

          <ul className="relatorio-lista">
            {porForma.map(([forma, valor]) => (
              <li key={forma}>
                <span className="nota">{forma}</span>
                <strong>{brl(valor)}</strong>
              </li>
            ))}
          </ul>

          <div className="campo-grupo__linha campo-grupo">
            <label className="campo-rotulo">Contado</label>
            <input className="campo campo--preco" value={contado} onChange={(e) => setContado(e.target.value)} />
          </div>

          <div className="campo-grupo__linha campo-grupo">
            <label className="campo-rotulo">Observação</label>
            <input className="campo" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          <div className="pedido-detalhe__acoes">
          <button
            type="button"
            className="botao botao--primario"
            disabled={fechar.isPending || !contado}
            onClick={() =>
              fechar.mutate(
                { valorContado: numero(contado), observacao: observacao || null },
                { onSuccess: () => { setContado(''); setObservacao(''); } },
              )
            }
          >
            Fechar caixa
          </button>
          </div>
        </section>
      ) : (
        <section className="cartao-painel caixa-fechado">
          <div className="cartao-painel__topo">
            <h2>Abrir o caixa</h2>
            <span className="nota">informe o fundo de troco</span>
          </div>

          <div className="campo-grupo__linha campo-grupo">
            <label className="campo-rotulo">Fundo de troco</label>
            <input className="campo campo--preco" value={fundo} onChange={(e) => setFundo(e.target.value)} />
          </div>

          <div className="pedido-detalhe__acoes">
            <button type="button" className="botao botao--primario" disabled={abrir.isPending} onClick={() => abrir.mutate({ valorInicial: numero(fundo) })}>
              Abrir caixa
            </button>
          </div>
        </section>
      )}

      <section className="cartao-painel caixa-historico">
        <div className="cartao-painel__topo">
          <h2>Fechamentos</h2>
          <span className="nota">{(caixa?.fechamentos ?? []).length} registro(s)</span>
        </div>

        <ul className="relatorio-lista">
          {(caixa?.fechamentos ?? []).map((f) => (
            <li key={f.id}>
              <span className="nota">{dataCurta(f.fechadaEm)}</span>
              <span className="nota">esperado {brl(f.esperado)}</span>
              <strong>{brl(f.contado)}</strong>
              <span className="nota" style={{ color: f.diferenca < 0 ? '#ff8b7f' : '#7fd6a5' }}>
                {f.diferenca < 0 ? '-' : '+'}
                {brl(Math.abs(f.diferenca))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PainelCaixa;
