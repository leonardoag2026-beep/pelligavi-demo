import { useState } from 'react';
import { useGetRelatorio } from '../../relatorios/hooks/relatorios-api.hooks';
import { useGetConfig } from '../../config/hooks/config-api.hooks';
import { useGetPedidos } from '../../pedidos/hooks/pedidos-api.hooks';
import { useGetResumoCustos } from '../../custos/hooks/custos-api.hooks';
import { useGetCaixa } from '../../caixa/hooks/caixa-api.hooks';
import { useGetFuncionarios } from '../../funcionarios/hooks/funcionarios-api.hooks';
import { brl } from '../../../shared/utils/format';

const PERIODOS = [
  { id: 'dia', nome: 'Diário', fator: 1, rotulo: 'hoje' },
  { id: 'semana', nome: 'Semanal', fator: 7, rotulo: 'esta semana' },
  { id: 'mes', nome: 'Mensal', fator: 30, rotulo: 'este mês' },
] as const;

const CAMINHOS: Record<string, string> = {
  pilha: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>',
  garfo: '<path d="M7 3v7a2 2 0 004 0V3"/><path d="M9 12v9"/><path d="M17 3c-2 2-2 5 0 7v11"/>',
  caminhao: '<path d="M2 6h11v9H2z"/><path d="M13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  sacola: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  sino: '<path d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
};

const Icone = ({ tipo }: { tipo: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: CAMINHOS[tipo] ?? '' }}
  />
);

const Rosquinha = ({ pct }: { pct: number }) => {
  const r = 26;
  const volta = 2 * Math.PI * r;
  return (
    <div className="visao__donut">
      <span className="visao__donut-centro">{pct}%</span>
      <span className="visao__donut-rotulo">Caixa sobre a meta</span>
      <span className="visao__donut-aro">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" />
          {pct > 0 && (
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="#2fd0a7"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(volta * pct) / 100} ${volta}`}
              transform="rotate(-90 32 32)"
            />
          )}
        </svg>
      </span>
    </div>
  );
};

export const PainelGeral: React.FC = () => {
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('mes');
  // o resumo já vai filtrado pelo período: antes vinha sem filtro e o ticket exibido
  // era de todos os tempos, enquanto a receita era da janela escolhida
  const periodoAtual = PERIODOS.find((x) => x.id === periodo)!;
  const inicioJanela = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (periodoAtual.fator - 1));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const { data: relatorio } = useGetRelatorio({ de: inicioJanela });
  const { data: config } = useGetConfig();
  const { data: pedidos } = useGetPedidos();
  const { data: custos } = useGetResumoCustos();
  const { data: funcionarios } = useGetFuncionarios();
  const { data: caixa } = useGetCaixa();
  const p = periodoAtual;
  // soma dos dias reais do período (vendasPorDia / comprasPorDia) — antes era o total
  // do mês dividido por 30, o que inventava um valor diário que não existe
  const diasPeriodo = p.fator;
  const chaveDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const janela = new Set<string>();
  for (let i = 0; i < diasPeriodo; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    janela.add(chaveDia(d));
  }
  const receita = (relatorio?.vendasPorDia ?? []).filter((d) => janela.has(d.dia)).reduce((s, d) => s + d.total, 0);
  const insumos = (relatorio?.comprasPorDia ?? []).filter((d) => janela.has(d.dia)).reduce((s, d) => s + d.total, 0);
  // custo fixo e folha são mensais no banco: rateio explícito pelos dias do período
  const fixos = Math.round(((custos?.mensal ?? 0) / 30) * diasPeriodo);
  // "Salários" era a conta de luz/água rateada. A folha é a soma dos salários ativos
  // contrato vencido não entra na folha; o valor é normalizado pela periodicidade no servidor
  const hojeISO = new Date().toISOString().slice(0, 10);
  const equipe = (funcionarios?.dados ?? []).filter((f) => f.ativo && (!f.dataFim || f.dataFim >= hojeISO));
  const folhaMes = equipe.reduce((soma, f) => soma + (f.mensalEquivalente ?? f.salario), 0);
  const salarios = Math.round((folhaMes / 30) * diasPeriodo);
  const gasto = insumos + fixos + salarios;
  const balanco = receita - gasto;
  const meta = config?.metaFaturamento ?? 0;
  const metaPct = meta > 0 ? Math.min(100, Math.round((receita / meta) * 100)) : 0;
  const emAndamento = (pedidos ?? []).filter((x) => ['recebido', 'preparo', 'pronto', 'rota'].includes(x.status)).length;
  // 'rota' é o status que o servidor emite para "saiu para entrega"
  const aReceber = (pedidos ?? []).filter((x) => x.status === 'rota').reduce((s, x) => s + x.total, 0);
  const disponivel = caixa?.aberto ? caixa.esperado : 0;
  const reserva = meta > 0 ? Math.min(100, Math.round((disponivel / meta) * 100)) : 0;
  const ticket = relatorio?.resumo.ticket ?? 0;
  const pedidosNoPeriodo = (relatorio?.vendasPorDia ?? [])
    .filter((d) => janela.has(d.dia))
    .reduce((soma, d) => soma + d.pedidos, 0);

  return (
    <div className="visao">
      <header className="visao__topo">
        <div className="visao__saudacao">
          <h1>Olá, Senhor Gerente</h1>
          <span className="visao__boas-vindas">Bem-vindo, novamente!</span>
          <span className="visao__regua" />
        </div>
        <button className="visao__sino" type="button" title={`${emAndamento} pedidos em andamento`}>
          <Icone tipo="sino" />
        </button>
      </header>

      <div className="visao__metricas">
        <div className="visao__metrica">
          <span className="visao__metrica-rotulo">
            <i>
              <Icone tipo="dinheiro" />
            </i>{' '}
            Total balanço
          </span>
          <strong>{brl(balanco)}</strong>
        </div>
        <div className="visao__metrica visao__metrica--dir">
          <span className="visao__metrica-rotulo">
            <i>
              <Icone tipo="sacola" />
            </i>{' '}
            Gasto total
          </span>
          <strong className="visao__negativo">-{brl(gasto)}</strong>
        </div>
      </div>

      <div className="visao__meta">
        <div className="visao__meta-linha">
          <span className="visao__meta-pct">{metaPct}%</span>
          <span className="visao__meta-alvo">{brl(meta)}</span>
        </div>
        <div className="visao__barra">
          <div className="visao__barra-fill" style={{ width: `${metaPct}%` }} />
        </div>
        <p className="visao__meta-nota">
          {metaPct}% da meta de faturamento — {p.rotulo} você fez {brl(receita)}.
        </p>
      </div>

      <section className="visao__cartao">
        <div className="visao__reserva">
          <Rosquinha pct={reserva} />
          <div className="visao__receitas">
            <div className="visao__receita">
              <span className="visao__receita-icone">
                <Icone tipo="pilha" />
              </span>
              <div>
                <span className="visao__receita-rotulo">Receita total</span>
                <strong>{brl(receita)}</strong>
              </div>
            </div>
            <div className="visao__receita">
              <span className="visao__receita-icone">
                <Icone tipo="garfo" />
              </span>
              <div>
                <span className="visao__receita-rotulo">Custo de insumos</span>
                <strong className="visao__negativo">-{brl(insumos)}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="visao__segmentado">
        {PERIODOS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={['visao__segmento', x.id === periodo ? 'visao__segmento--ativo' : ''].join(' ').trim()}
            onClick={() => setPeriodo(x.id)}
          >
            {x.nome}
          </button>
        ))}
      </div>

      <ul className="visao__linhas">
        {[
          // todas as linhas usam a mesma janela do período escolhido
          {
            icone: 'caminhao',
            titulo: 'Delivery',
            quando: `vendas · ${p.rotulo}`,
            rotulo: 'Vendas',
            valor: receita,
          },
          { icone: 'sacola', titulo: 'Insumos', quando: `custo de insumos · ${p.rotulo}`, rotulo: 'Compras', valor: -insumos },
          {
            icone: 'pilha',
            titulo: 'Salários',
            quando: `folha · ${equipe.length} ${equipe.length === 1 ? 'pessoa' : 'pessoas'}`,
            rotulo: 'Folha',
            valor: -salarios,
          },
          { icone: 'dinheiro', titulo: 'Custos fixos', quando: `contas de consumo · ${p.rotulo}`, rotulo: 'Fixos', valor: -fixos },
        ].map((l) => (
          <li key={l.titulo} className="visao__linha">
            <span className="visao__linha-icone">
              <Icone tipo={l.icone} />
            </span>
            <div className="visao__linha-texto">
              <strong>{l.titulo}</strong>
              <span className="visao__linha-quando">{l.quando}</span>
            </div>
            <span className="visao__linha-rotulo">{l.rotulo}</span>
            <strong className={['visao__linha-valor', l.valor < 0 ? 'visao__negativo' : ''].join(' ').trim()}>
              {l.valor < 0 ? '-' : ''}
              {brl(Math.abs(l.valor))}
            </strong>
          </li>
        ))}
      </ul>

      <div className="visao__rodape">
        <span className="nota">
          Caixa: {brl(disponivel)} disponível · {brl(aReceber)} a receber
        </span>
        <span className="nota">
          {pedidosNoPeriodo} {pedidosNoPeriodo === 1 ? 'pedido' : 'pedidos'} no período · ticket {brl(ticket)}
        </span>
      </div>
    </div>
  );
};
