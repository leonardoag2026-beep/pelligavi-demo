import React, { useEffect, useMemo, useState } from 'react';
import { useAtualizarConfig, useGetConfig } from '../hooks/config-api.hooks';
import { brl } from '../../../shared/utils/format';

type Faixa = { minimo: string; percentual: string };

const cartao: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.9rem' };
const topo: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const titulo: React.CSSProperties = { margin: 0, fontSize: '1rem' };
const ajuda: React.CSSProperties = { margin: 0, fontSize: '0.78rem', lineHeight: 1.5, color: '#8b857c' };
const linha: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 190px)',
  alignItems: 'center',
  gap: '0.8rem',
  minHeight: 44,
};
const rotulo: React.CSSProperties = {
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--texto-fraco)',
};
const campo: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '0.5rem 0.7rem',
  borderRadius: 9,
  border: '1px solid #2b2722',
  background: '#141210',
  color: '#f2efe8',
  font: 'inherit',
  fontSize: '0.88rem',
  fontVariantNumeric: 'tabular-nums',
};
const exemplo: React.CSSProperties = {
  borderRadius: 10,
  border: '1px dashed #2b2722',
  padding: '0.6rem 0.75rem',
  fontSize: '0.78rem',
  color: 'var(--texto-fraco)',
};

const paraTexto = (centavos: number) =>
  (centavos / 100)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const paraCentavos = (texto: string) => Math.round(Number(String(texto).replace(/\./g, '').replace(',', '.')) * 100) || 0;

const Slider: React.FC<{ valor: string; min: number; max: number; passo: number; sufixo?: string; aoMudar: (v: string) => void }> = ({
  valor,
  min,
  max,
  passo,
  sufixo,
  aoMudar,
}) => {
  const numero = Number(String(valor).replace(',', '.')) || min;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={Math.min(max, Math.max(min, numero))}
        onChange={(e) => aoMudar(e.target.value)}
        style={{ flex: '1 1 auto', minWidth: 0, accentColor: 'var(--accent)', height: 30 }}
      />
      <input
        inputMode="decimal"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        style={{ ...campo, width: 74, flex: '0 0 auto', textAlign: 'right' }}
        aria-label="valor"
      />
      {sufixo ? <span style={{ fontSize: '0.75rem', color: 'var(--texto-fraco)' }}>{sufixo}</span> : null}
    </div>
  );
};

export const PainelConfig: React.FC = () => {
  const { data: config } = useGetConfig();
  const salvar = useAtualizarConfig();

  const [taxa, setTaxa] = useState('');
  const [meta, setMeta] = useState('');
  const [freteGratis, setFreteGratis] = useState('');
  const [raio, setRaio] = useState('');
  const [endereco, setEndereco] = useState('');
  const [nome, setNome] = useState('');
  const [prazoEntMin, setPrazoEntMin] = useState('');
  const [prazoEntMax, setPrazoEntMax] = useState('');
  const [prazoRetMin, setPrazoRetMin] = useState('');
  const [prazoRetMax, setPrazoRetMax] = useState('');
  const [faixas, setFaixas] = useState<Faixa[]>([]);

  useEffect(() => {
    if (!config) return;
    setTaxa(paraTexto(config.taxaBase));
    setMeta(paraTexto(config.metaFaturamento));
    setFreteGratis(paraTexto(config.freteGratisAcima ?? 0));
    setRaio(String(config.raioEntregaKm ?? 10).replace('.', ','));
    setEndereco(config.enderecoRetirada ?? '');
    setNome(config.nome ?? '');
    setPrazoEntMin(String(config.prazoEntregaMin ?? 35));
    setPrazoEntMax(String(config.prazoEntregaMax ?? 45));
    setPrazoRetMin(String(config.prazoRetiradaMin ?? 20));
    setPrazoRetMax(String(config.prazoRetiradaMax ?? 30));
    setFaixas((config.faixas ?? []).map((f) => ({ minimo: paraTexto(f.minimo), percentual: String(f.percentual) })));
  }, [config]);

  const ordenadas = useMemo(
    () => [...faixas].sort((a, b) => paraCentavos(a.minimo) - paraCentavos(b.minimo)),
    [faixas],
  );

  const aplicar = () =>
    salvar.mutate({
      taxaBase: paraCentavos(taxa),
      metaFaturamento: paraCentavos(meta),
      freteGratisAcima: paraCentavos(freteGratis),
      raioEntregaKm: Number(String(raio).replace(',', '.')) || 0,
      enderecoRetirada: endereco.trim(),
      nome: nome.trim() || 'Pelligavi',
      prazoEntregaMin: Number(prazoEntMin) || 0,
      prazoEntregaMax: Number(prazoEntMax) || 0,
      prazoRetiradaMin: Number(prazoRetMin) || 0,
      prazoRetiradaMax: Number(prazoRetMax) || 0,
      faixas: faixas
        .filter((f) => paraCentavos(f.minimo) > 0)
        .map((f) => ({ minimo: paraCentavos(f.minimo), percentual: Number(String(f.percentual).replace(',', '.')) || 0 })),
    });

  const mudarFaixa = (indice: number, campo: keyof Faixa, valor: string) =>
    setFaixas((atual) => atual.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));

  const excluirFaixa = (indice: number) => setFaixas((atual) => atual.filter((_, i) => i !== indice));

  const pedidoExemplo = 10000;
  const descontoExemplo = ordenadas
    .map((f) => {
      const minimo = paraCentavos(f.minimo);
      return minimo > 0 && pedidoExemplo >= minimo ? Number(String(f.percentual).replace(',', '.')) || 0 : 0;
    })
    .reduce((maior, atual) => Math.max(maior, atual), 0);

  return (
    <div className="config" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* resumo do que está valendo */}
      <section className="cartao-painel" style={cartao}>
        <div style={topo}>
          <h2 style={titulo}>Como a loja está hoje</h2>
          <span className="nota">atualiza no próximo carregamento do site</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            `Entrega ${brl(config?.taxaBase ?? 0)}`,
            `Grátis acima de ${brl(config?.freteGratisAcima ?? 0)}`,
            `Entrega ${config?.prazoEntregaMin ?? 0}–${config?.prazoEntregaMax ?? 0} min`,
            `Retirada ${config?.prazoRetiradaMin ?? 0}–${config?.prazoRetiradaMax ?? 0} min`,
            `Raio ${String(config?.raioEntregaKm ?? 0).replace('.', ',')} km`,
          ].map((texto) => (
            <span
              key={texto}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: 999,
                border: '1px solid #2b2722',
                fontSize: '0.76rem',
                color: 'var(--texto-fraco)',
                whiteSpace: 'nowrap',
              }}
            >
              {texto}
            </span>
          ))}
        </div>
      </section>

      <section className="cartao-painel" style={cartao}>
        <div style={topo}>
          <h2 style={titulo}>Loja e retirada</h2>
          <span className="nota">aparece no site e no rodapé</span>
        </div>
        <div style={linha}>
          <label style={rotulo} htmlFor="cfg-nome">Nome da loja</label>
          <input id="cfg-nome" style={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={rotulo} htmlFor="cfg-endereco">Endereço de retirada</label>
          <input id="cfg-endereco" style={campo} value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Raio de entrega</label>
          <Slider valor={raio} min={1} max={30} passo={0.5} sufixo="km" aoMudar={setRaio} />
        </div>
        <p style={ajuda}>Pedidos com endereço mais distante que o raio são recusados no servidor e no checkout.</p>
      </section>

      <section className="cartao-painel" style={cartao}>
        <div style={topo}>
          <h2 style={titulo}>Entrega</h2>
          <span className="nota">taxa, frete grátis e prazos</span>
        </div>
        <div style={linha}>
          <label style={rotulo}>Taxa de entrega</label>
          <input style={campo} inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Frete grátis a partir de</label>
          <input style={campo} inputMode="decimal" value={freteGratis} onChange={(e) => setFreteGratis(e.target.value)} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Prazo de entrega (mín)</label>
          <Slider valor={prazoEntMin} min={5} max={120} passo={5} sufixo="min" aoMudar={setPrazoEntMin} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Prazo de entrega (máx)</label>
          <Slider valor={prazoEntMax} min={10} max={180} passo={5} sufixo="min" aoMudar={setPrazoEntMax} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Prazo de retirada (mín)</label>
          <Slider valor={prazoRetMin} min={5} max={90} passo={5} sufixo="min" aoMudar={setPrazoRetMin} />
        </div>
        <div style={linha}>
          <label style={rotulo}>Prazo de retirada (máx)</label>
          <Slider valor={prazoRetMax} min={10} max={120} passo={5} sufixo="min" aoMudar={setPrazoRetMax} />
        </div>
      </section>

      <section className="cartao-painel" style={cartao}>
        <div style={topo}>
          <h2 style={titulo}>Desconto por valor do pedido</h2>
          <span className="nota">aplicado no checkout, sobre o subtotal</span>
        </div>

        <p style={ajuda}>
          Cada faixa é um gatilho: quando o subtotal do pedido alcança o valor mínimo, o desconto entra sozinho.
          Se o pedido passa de duas faixas vale a maior — nunca as duas somadas.
        </p>

        {faixas.map((faixa, indice) => {
          const minimo = paraCentavos(faixa.minimo);
          const percentual = Number(String(faixa.percentual).replace(',', '.')) || 0;
          const valorComDesconto = Math.round(minimo * (1 - percentual / 100));
          return (
            <div key={indice} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 34px', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--texto-fraco)', whiteSpace: 'nowrap' }}>a partir de R$</span>
                  <input
                    style={campo}
                    inputMode="decimal"
                    value={faixa.minimo}
                    onChange={(e) => mudarFaixa(indice, 'minimo', e.target.value)}
                    aria-label={`valor mínimo da faixa ${indice + 1}`}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    style={{ ...campo, textAlign: 'right' }}
                    inputMode="decimal"
                    value={faixa.percentual}
                    onChange={(e) => mudarFaixa(indice, 'percentual', e.target.value)}
                    aria-label={`percentual da faixa ${indice + 1}`}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--texto-fraco)' }}>%</span>
                </div>
                <button
                  type="button"
                  className="botao botao--discreto botao--mini"
                  aria-label={`remover faixa de ${faixa.minimo}`}
                  onClick={() => excluirFaixa(indice)}
                  style={{ minWidth: 34, padding: 0, justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--texto-fraco)' }}>
                pedido de {brl(minimo)} → {percentual}% off = {brl(valorComDesconto)}
              </span>
            </div>
          );
        })}

        <button
          type="button"
          className="botao botao--vidro botao--mini"
          onClick={() => setFaixas((atual) => [...atual, { minimo: '0,00', percentual: '5' }])}
          disabled={faixas.length >= 6}
          style={{ alignSelf: 'flex-start' }}
        >
          + Adicionar faixa
        </button>

        <div style={exemplo}>
          Exemplo: um pedido de <b>{brl(pedidoExemplo)}</b> cai na faixa de <b>{descontoExemplo}%</b> e fecha em{' '}
          <b>{brl(Math.round(pedidoExemplo * (1 - descontoExemplo / 100)))}</b>.
        </div>
      </section>

      <section className="cartao-painel" style={cartao}>
        <div style={topo}>
          <h2 style={titulo}>Meta de faturamento</h2>
          <span className="nota">usada na aba Análise</span>
        </div>
        <div style={linha}>
          <label style={rotulo}>Meta do período</label>
          <input style={campo} inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
      </section>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="botao botao--discreto botao--mini"
          onClick={() => {
            if (!config) return;
            // descarta TUDO que o formulário edita, não só taxa/meta/raio
            setTaxa(paraTexto(config.taxaBase));
            setMeta(paraTexto(config.metaFaturamento));
            setFreteGratis(paraTexto(config.freteGratisAcima ?? 0));
            setRaio(String(config.raioEntregaKm ?? 10).replace('.', ','));
            setFaixas((config.faixas ?? []).map((f) => ({ minimo: paraTexto(f.minimo), percentual: String(f.percentual) })));
            setNome(config.nome);
            setEndereco(config.enderecoRetirada ?? '');
            setPrazoEntMin(String(config.prazoEntregaMin));
            setPrazoEntMax(String(config.prazoEntregaMax));
            setPrazoRetMin(String(config.prazoRetiradaMin));
            setPrazoRetMax(String(config.prazoRetiradaMax));
          }}
        >
          Descartar alterações
        </button>
        <button type="button" className="botao botao--primario" onClick={aplicar} disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>

      <p style={ajuda}>
        {salvar.isSuccess ? 'Configuração salva.' : salvar.isError ? 'Não foi possível salvar. Confira os valores.' : ' '}
      </p>
    </div>
  );
};

export default PainelConfig;
