import { useMemo, useState } from 'react';
import { useGetCompras, useGetContas } from '../../../custos/hooks/custos-api.hooks';
import { useGetPedidos } from '../../../pedidos/hooks/pedidos-api.hooks';
import { useGetReembolsos, useCriarCobranca } from '../../../pagamentos/hooks/pagamentos-api.hooks';
import { brl } from '../../../../shared/utils/format';

// mesmos ícones da tela antiga (src/features/painel/transacoes.ts)
const ICONE: Record<string, string> = {
  venda: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  insumo: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  fixo: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  taxa: '<path d="M3 12h18"/><path d="M12 3v18"/>',
  link: '<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>',
  aluguel: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  luz: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z"/>',
  internet: '<path d="M4 10a12 12 0 0116 0"/><path d="M7 13a8 8 0 0110 0"/><path d="M10 16a4 4 0 014 0"/><circle cx="12" cy="19" r="1"/>',
  gas: '<path d="M8 3h8v4H8z"/><path d="M9 7v4a4 4 0 004 4v6"/>',
};

const svg = (chave: string, lado = 22) =>
  `<svg viewBox="0 0 24 24" width="${lado}" height="${lado}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${
    ICONE[chave] ?? ICONE.link
  }</svg>`;

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesDe = (data: string) => MESES[new Date(data).getMonth()];

const hora = (data: string) => new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const PainelTransacoes: React.FC = () => {
  const { data: pedidos } = useGetPedidos();
  const { data: compras } = useGetCompras();
  const { data: contas } = useGetContas();
  const { data: reembolsos } = useGetReembolsos();
  const criar = useCriarCobranca();

  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);

  // tudo vem do banco: pedidos, compras de insumo, contas do mês e reembolsos
  const itens = useMemo(() => {
    const lista = [
      ...(pedidos ?? [])
        .filter((p) => p.status !== 'cancelado')
        .map((p) => ({
          id: `p${p.id}`,
          tipo: 'receita' as const,
          icone: 'venda',
          titulo: p.id,
          categoria: p.canal || 'Site',
          quando: p.criadoEm,
          valor: p.total,
        })),
      ...(compras ?? []).map((c) => ({
        id: `c${c.id}`,
        tipo: 'despesa' as const,
        icone: 'insumo',
        titulo: c.ingrediente,
        categoria: 'Insumos',
        quando: c.compradaEm,
        valor: c.valorTotal,
      })),
      ...(contas ?? []).map((c) => ({
        id: `k${c.id}`,
        tipo: 'despesa' as const,
        icone: c.icone || 'fixo',
        titulo: c.nome,
        categoria: c.categoria,
        quando: c.dataInicio ? new Date(`${c.dataInicio}T12:00:00`).toISOString() : new Date().toISOString(),
        semData: true, // conta não tem data de lançamento: é recorrência mensal
        // conta imediata é compra única: o valor cheio é o que saiu do caixa,
        // mensalEquivalente é 0 para ela e a linha aparecia valendo R$ 0,00
        // encerrada (vigente = false) também cai no valor cheio: mensalEquivalente vem 0
        valor: c.tipo === 'imediato' || !c.vigente ? c.valor : c.mensalEquivalente,
      })),
      ...(reembolsos?.dados ?? []).map((r) => ({
        id: `r${r.id}`,
        tipo: 'despesa' as const,
        icone: 'taxa',
        titulo: r.pedidoRef ?? 'Reembolso',
        categoria: 'Reembolso',
        quando: r.criadoEm,
        valor: r.valor,
      })),
    ];
    return lista.sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime());
  }, [pedidos, compras, contas, reembolsos]);

  const receita = itens.filter((i) => i.tipo === 'receita').reduce((s, i) => s + i.valor, 0);
  const despesa = itens.filter((i) => i.tipo === 'despesa').reduce((s, i) => s + i.valor, 0);
  const saldo = receita - despesa;

  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof itens>();
    itens.forEach((i) => {
      const chave = mesDe(i.quando);
      mapa.set(chave, [...(mapa.get(chave) ?? []), i]);
    });
    return [...mapa.entries()];
  }, [itens]);

  const gerar = () => {
    if (!valor) return;
    const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();
    const centavos = Math.round(Number(valor.replace(',', '.')) * 100);
    criar.mutate(
      {
        codigo,
        body: {
          tipo: 'balcao',
          metodo: 'pix',
          cliente: { nome: descricao || 'Consumidor' },
          // valor digitado no balcão é a única exceção: não existe produto por trás
          avulsa: { descricao: descricao || 'Cobrança avulsa', valor: centavos },
          itens: [],
        },
      },
      { onSuccess: () => setResultado(codigo) },
    );
  };

  return (
    <div className="trans">
      <div className="trans__saldo">
        <span className="trans__saldo-rotulo">Saldo total</span>
        <strong className="trans__saldo-valor">{brl(saldo)}</strong>
      </div>

      <div className="trans__par">
        <div className="trans__cartao trans__cartao--rec">
          <span className="trans__cartao-icone" dangerouslySetInnerHTML={{ __html: svg('venda') }} />
          <span className="trans__cartao-rotulo">Receitas</span>
          <strong>{brl(receita)}</strong>
        </div>
        <div className="trans__cartao trans__cartao--des">
          <span className="trans__cartao-icone" dangerouslySetInnerHTML={{ __html: svg('taxa') }} />
          <span className="trans__cartao-rotulo">Despesas</span>
          <strong>-{brl(despesa)}</strong>
        </div>
      </div>

      <button type="button" className="trans__cobrar" onClick={() => setAberto(true)}>
        <span dangerouslySetInnerHTML={{ __html: svg('link', 18) }} />
        <span>Cobrar</span>
      </button>

      <div className="trans__lista">
        {grupos.map(([mes, lista]) => (
          <section key={mes} className="trans__mes">
            <h3 className="trans__mes-titulo">{mes}</h3>
            <ul>
              {lista.map((item) => (
                <li key={item.id} className="trans__linha">
                  <span
                    className={`trans__icone trans__icone--${item.tipo}`}
                    dangerouslySetInnerHTML={{ __html: svg(item.icone) }}
                  />
                  <div className="trans__texto">
                    <strong>{item.titulo}</strong>
                    <span className="trans__quando">
                      {'semData' in item && item.semData
                        ? 'todo mês'
                        : `${hora(item.quando)} · ${new Date(item.quando).getDate()} de ${mes}`}
                    </span>
                  </div>
                  <span className="trans__categoria">{item.categoria}</span>
                  <strong className={`trans__valor trans__valor--${item.tipo}`}>
                    {item.tipo === 'receita' ? '+' : '-'}
                    {brl(item.valor)}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {aberto && (
        <div className="cobrar__fundo" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <div className="cobrar__caixa">
            <header className="cobrar__topo">
              <h2>Cobrar</h2>
              <button type="button" className="cobrar__fechar" onClick={() => setAberto(false)}>
                ✕
              </button>
            </header>
            <p className="nota">Cobrança avulsa: entra como receita quando for paga.</p>

            <div className="campo-grupo">
              <label className="campo-rotulo">Valor</label>
              <input className="campo campo--preco" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="campo-grupo">
              <label className="campo-rotulo">Descrição</label>
              <input className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>

            <button
              type="button"
              className="botao botao--primario"
              onClick={gerar}
              disabled={criar.isPending || !valor}
            >
              Gerar cobrança PIX
            </button>

            {resultado && (
              <div className="cobrar__resultado">
                <span className="nota">Cobrança gerada</span>
                <strong className="cobrar__link">{resultado}</strong>
                <button
                  type="button"
                  className="botao botao--fantasma cobrar__copiar"
                  onClick={() => navigator.clipboard?.writeText(resultado)}
                >
                  Copiar código
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PainelTransacoes;
