import { useMemo, useState } from 'react';
import { useGetRelatorio } from '../../../relatorios/hooks/relatorios-api.hooks';
import { useGetConfig } from '../../../config/hooks/config-api.hooks';
import { brl } from '../../../../shared/utils/format';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CAMINHOS: Record<string, string> = {
  saldo: '<path d="M4 12l5 5L20 6"/>',
  gasto: '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
  receita: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>',
  despesa: '<path d="M17 7L7 17"/><path d="M15 17H7V9"/>',
  lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  lista: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
};

const Svg = ({ tipo }: { tipo: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: CAMINHOS[tipo] ?? '' }}
  />
);

const SEGMENTOS = [
  ['diario', 'Diário'],
  ['semanal', 'Semanal'],
  ['mensal', 'Mensal'],
  ['ano', 'Ano'],
] as const;

export const PainelAnalise: React.FC = () => {
  const [periodo, setPeriodo] = useState<'diario' | 'semanal' | 'mensal' | 'ano'>('diario');
  const { data: config } = useGetConfig();
  // cada botão com a sua janela: antes Diário e Semanal mostravam os mesmos 7 dias
  // e Ano mostrava 30
  const dias = periodo === 'diario' ? 1 : periodo === 'semanal' ? 7 : periodo === 'mensal' ? 30 : 365;

  const de = useMemo(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1));
    return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`;
  }, [dias]);

  const { data: relatorio } = useGetRelatorio({ de });

  const pontos = useMemo(() => {
    const receitaPorDia = new Map((relatorio?.vendasPorDia ?? []).map((d) => [d.dia, d.total]));
    const compraPorDia = new Map((relatorio?.comprasPorDia ?? []).map((d) => [d.dia, d.total]));
    const hoje = new Date();
    if (periodo === 'ano') {
      // 365 barras não cabem na tela: o ano é lido em 12 meses
      const baldes = new Map<string, { receita: number; despesa: number }>();
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        baldes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, { receita: 0, despesa: 0 });
      }
      for (const [dia, valor] of receitaPorDia) {
        const balde = baldes.get(dia.slice(0, 7));
        if (balde) balde.receita += valor;
      }
      for (const [dia, valor] of compraPorDia) {
        const balde = baldes.get(dia.slice(0, 7));
        if (balde) balde.despesa += valor;
      }
      return [...baldes.entries()].map(([chave, v]) => ({
        rotulo: MESES[Number(chave.slice(5, 7)) - 1]!,
        receita: v.receita,
        despesa: v.despesa,
      }));
    }
    return Array.from({ length: dias }, (_, indice) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1 - indice));
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { rotulo: DIAS[d.getDay()], receita: receitaPorDia.get(chave) ?? 0, despesa: compraPorDia.get(chave) ?? 0 };
    });
  }, [relatorio, dias, periodo]);

  const receita = pontos.reduce((s, p) => s + p.receita, 0);
  const despesa = pontos.reduce((s, p) => s + p.despesa, 0);
  const saldo = receita - despesa;
  const topo = Math.max(...pontos.map((p) => Math.max(p.receita, p.despesa)), 1);
  // a meta do banco é mensal: comparar com 1 dia (ou 1 ano) exige rateio explícito
  const meta = config?.metaFaturamento ?? 0;
  const metaJanela = Math.round(meta * (periodo === 'ano' ? 12 : dias / 30));
  const metaPct = metaJanela > 0 ? Math.min(100, Math.round((receita / metaJanela) * 100)) : 0;

  return (
    <div className="analise">
      <div className="analise__metricas">
        <div className="analise__metrica">
          <span className="analise__rotulo">
            <i>
              <Svg tipo="saldo" />
            </i>{' '}
            Saldo total
          </span>
          <strong>{brl(saldo)}</strong>
        </div>
        <div className="analise__metrica analise__metrica--dir">
          <span className="analise__rotulo">
            <i>
              <Svg tipo="gasto" />
            </i>{' '}
            Gasto total
          </span>
          <strong className="analise__negativo">-{brl(despesa)}</strong>
        </div>
      </div>

      <div className="visao__meta">
        <div className="visao__meta-linha">
          <span className="visao__meta-pct">{metaPct}%</span>
          <span className="visao__meta-alvo">{brl(metaJanela)}</span>
        </div>
        <div className="visao__barra">
          <div className="visao__barra-fill" style={{ width: `${metaPct}%` }} />
        </div>
        <p className="visao__meta-nota">{metaPct}% da meta de faturamento do período</p>
      </div>

      <section className="analise__folha">
        <div className="analise__segmentado">
          {SEGMENTOS.map(([id, nome]) => (
            <button
              key={id}
              type="button"
              className={['analise__segmento', periodo === id ? 'analise__segmento--ativo' : ''].join(' ').trim()}
              onClick={() => setPeriodo(id)}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="analise__grafico">
          <header className="analise__grafico-topo">
            <h2>Receitas &amp; Despesas</h2>
            <div className="analise__acoes">
              <button type="button" className="analise__acao" aria-label="Buscar">
                <Svg tipo="lupa" />
              </button>
              <button type="button" className="analise__acao" aria-label="Listar">
                <Svg tipo="lista" />
              </button>
            </div>
          </header>

          <div className="analise__plot">
            <div className="analise__eixo">
              {['15k', '10k', '5k', '1k'].map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
            <div className="analise__barras">
              {pontos.map((p, indice) => (
                <div key={`${p.rotulo}-${indice}`} className="analise__dia">
                  <div className="analise__par">
                    <span
                      className="analise__barra analise__barra--rec"
                      style={{ height: `${Math.max(2, Math.round((p.receita / topo) * 100))}%` }}
                      title={`Receita ${brl(p.receita)}`}
                    />
                    <span
                      className="analise__barra analise__barra--des"
                      style={{ height: `${Math.max(2, Math.round((p.despesa / topo) * 100))}%` }}
                      title={`Despesa ${brl(p.despesa)}`}
                    />
                  </div>
                  <span className="analise__dia-nome">{p.rotulo}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analise__base" />
        </div>

        <div className="analise__resumo">
          <div className="analise__resumo-item">
            <span className="analise__resumo-icone analise__resumo-icone--rec">
              <Svg tipo="receita" />
            </span>
            <span className="analise__resumo-rotulo">Receitas</span>
            <strong className="analise__resumo-valor analise__resumo-valor--rec">{brl(receita)}</strong>
          </div>
          <div className="analise__resumo-item">
            <span className="analise__resumo-icone analise__resumo-icone--des">
              <Svg tipo="despesa" />
            </span>
            <span className="analise__resumo-rotulo">Despesas</span>
            <strong className="analise__resumo-valor analise__resumo-valor--des">-{brl(despesa)}</strong>
          </div>
        </div>

        <div className="analise__metas">
          <h2 className="analise__metas-titulo">Minhas metas</h2>
          <div className="analise__meta-linha">
            <div className="analise__meta-texto">
              <strong>Faturamento do período</strong>
              <span className="nota">
                Meta {brl(metaJanela)} · faltam {brl(Math.max(0, metaJanela - receita))}
              </span>
            </div>
            <div className="analise__meta-progresso">
              <div className="analise__meta-fill" style={{ width: `${metaPct}%` }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
