import { useMemo, useState } from 'react';
import { TbPencil, TbPlus, TbTrash } from 'react-icons/tb';
import {
  useAtualizarConta,
  useCriarConta,
  useGetCompras,
  useGetContas,
  useGetResumoCustos,
  useRemoverConta,
} from '../hooks/custos-api.hooks';
import type { Conta, NovaContaRequest, TipoConta } from '../../../api/services/custos';
import { brl, dataCurta } from '../../../shared/utils/format';

// mesmos ícones da tela antiga (src/features/painel/custos.ts)
const ICONES: Record<string, string> = {
  aluguel: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  luz: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z"/>',
  internet: '<path d="M4 10a12 12 0 0116 0"/><path d="M7 13a8 8 0 0110 0"/><path d="M10 16a4 4 0 014 0"/><circle cx="12" cy="19" r="1"/>',
  gas: '<path d="M8 3h8v4H8z"/><path d="M9 7v4a4 4 0 004 4v6"/>',
  outros: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
};

const svg = (chave: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${
    ICONES[chave] ?? ICONES.outros
  }</svg>`;

type Fim = 'nunca' | 'data' | 'vezes';

interface Formulario {
  nome: string;
  categoria: string;
  valor: string;
  icone: string;
  tipo: TipoConta;
  intervalo: string;
  diaVencimento: string;
  dataInicio: string;
  fim: Fim;
  dataFim: string;
  repeticoes: string;
}

// toISOString() é UTC: das 21h em diante a conta nascia com a data de amanhã
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const vazio: Formulario = {
  nome: '',
  categoria: 'operacional',
  valor: '',
  icone: 'outros',
  tipo: 'mensal',
  intervalo: '30',
  diaVencimento: '',
  dataInicio: hoje(),
  fim: 'nunca',
  dataFim: '',
  repeticoes: '',
};

const paraFormulario = (conta: Conta): Formulario => ({
  nome: conta.nome,
  categoria: conta.categoria,
  valor: (conta.valor / 100).toFixed(2).replace('.', ','),
  icone: conta.icone,
  tipo: conta.tipo,
  intervalo: String(conta.intervaloDias ?? 30),
  diaVencimento: conta.diaVencimento ? String(conta.diaVencimento) : '',
  dataInicio: conta.dataInicio ?? hoje(),
  fim: conta.dataFim ? 'data' : conta.repeticoes ? 'vezes' : 'nunca',
  dataFim: conta.dataFim ?? '',
  repeticoes: conta.repeticoes ? String(conta.repeticoes) : '',
});

const numero = (texto: string) => Number(String(texto).replace(',', '.')) || 0;

// descrição legível da recorrência, usada na lista e no resumo do formulário
const descrever = (f: { tipo: TipoConta; intervalo: string; diaVencimento: string; dataInicio: string; fim: Fim; dataFim: string; repeticoes: string }) => {
  if (f.tipo === 'imediato') return 'cobrança única';
  const base =
    f.tipo === 'mensal'
      ? f.diaVencimento
        ? `todo mês, dia ${f.diaVencimento}`
        : 'todo mês'
      : `a cada ${f.intervalo || '?'} dias`;
  const comeco = f.dataInicio ? ` · desde ${dataCurta(f.dataInicio)}` : '';
  const fim =
    f.fim === 'data' && f.dataFim
      ? ` · até ${dataCurta(f.dataFim)}`
      : f.fim === 'vezes' && f.repeticoes
        ? ` · ${f.repeticoes}×`
        : '';
  return `${base}${comeco}${fim}`;
};

const mensalDe = (f: Formulario) => {
  const valor = Math.round(numero(f.valor) * 100);
  if (f.tipo === 'imediato') return 0;
  if (f.tipo === 'mensal') return valor;
  const dias = Math.max(1, Number(f.intervalo) || 30);
  return Math.round((valor * 30) / dias);
};

export const PainelCustos: React.FC = () => {
  const { data: contas } = useGetContas();
  const { data: compras } = useGetCompras();
  const { data: resumo } = useGetResumoCustos();
  const criar = useCriarConta();
  const atualizar = useAtualizarConta();
  const remover = useRemoverConta();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [f, setF] = useState<Formulario>(vazio);

  const mexer = (campo: keyof Formulario, valor: string) => setF((atual) => ({ ...atual, [campo]: valor }));

  const abrirNovo = () => {
    setEditando(null);
    setF({ ...vazio, dataInicio: hoje() });
    setAberto(true);
  };

  const abrirEdicao = (conta: Conta) => {
    setEditando(conta);
    setF(paraFormulario(conta));
    setAberto(true);
  };

  const corpo = (): NovaContaRequest => ({
    nome: f.nome.trim(),
    categoria: f.categoria,
    valor: Math.round(numero(f.valor) * 100),
    tipo: f.tipo,
    intervaloDias: f.tipo === 'periodico' ? Math.max(1, Number(f.intervalo) || 30) : null,
    diaVencimento: f.tipo === 'mensal' && f.diaVencimento ? Number(f.diaVencimento) : null,
    dataInicio: f.dataInicio || null,
    dataFim: f.fim === 'data' && f.dataFim ? f.dataFim : null,
    repeticoes: f.fim === 'vezes' && f.repeticoes ? Math.max(1, Number(f.repeticoes)) : null,
    icone: f.icone,
  });

  const salvar = () => {
    if (!f.nome.trim() || !f.valor) return;
    const enviar = corpo();
    const fim = () => {
      setAberto(false);
      setEditando(null);
      setF(vazio);
    };
    if (editando) atualizar.mutate({ id: editando.id, body: enviar }, { onSuccess: fim });
    else criar.mutate(enviar, { onSuccess: fim });
  };

  const mensalPrevisto = useMemo(() => mensalDe(f), [f]);
  const podeSalvar = f.nome.trim().length > 0 && numero(f.valor) > 0 && !criar.isPending && !atualizar.isPending;

  return (
    <div className="custos">
      <div className="custos__resumo" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.6rem' }}>
        <div style={{ display: 'grid' }}>
          <span className="nota">Custo mensal vigente</span>
          <strong>{brl(resumo?.mensal ?? 0)}</strong>
        </div>
        <div style={{ display: 'grid' }}>
          <span className="nota">Compras (30 dias)</span>
          <strong>{brl(resumo?.compras30d ?? 0)}</strong>
        </div>
        <div style={{ display: 'grid' }}>
          <span className="nota">Contas ativas</span>
          <strong>{(contas ?? []).length}</strong>
        </div>
      </div>

      <button type="button" className="custos__novo" onClick={abrirNovo}>
        <TbPlus size={16} /> Nova conta
      </button>

      {aberto && (
        <div className="cartao-painel" style={{ display: 'grid', gap: '0.7rem' }}>
          <span className="campo-rotulo">{editando ? `Editando ${editando.nome}` : 'Nova conta'}</span>

          <div className="linha-campos">
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-nome">Nome</label>
              <input id="conta-nome" className="campo" placeholder="Ex.: Conta de luz" value={f.nome} onChange={(e) => mexer('nome', e.target.value)} />
            </div>
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-valor">Valor da cobrança</label>
              <input id="conta-valor" className="campo" inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => mexer('valor', e.target.value)} />
            </div>
          </div>

          <div className="linha-campos linha-campos--3">
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-cat">Categoria</label>
              <select id="conta-cat" className="campo" value={f.categoria} onChange={(e) => mexer('categoria', e.target.value)}>
                <option value="operacional">operacional</option>
                <option value="fixo">fixo</option>
                <option value="insumo">insumo</option>
                <option value="pessoal">pessoal</option>
              </select>
            </div>
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-icone">Ícone</label>
              <select id="conta-icone" className="campo" value={f.icone} onChange={(e) => mexer('icone', e.target.value)}>
                {Object.keys(ICONES).map((chave) => (
                  <option key={chave} value={chave}>{chave}</option>
                ))}
              </select>
            </div>
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-tipo">Quando cobra</label>
              <select
                id="conta-tipo"
                className="campo"
                value={f.tipo}
                onChange={(e) => mexer('tipo', e.target.value as TipoConta)}
              >
                <option value="mensal">Todo mês</option>
                <option value="periodico">De tantos em tantos dias</option>
                <option value="imediato">Uma vez só</option>
              </select>
            </div>
          </div>

          <div className="linha-campos linha-campos--3">
            {f.tipo === 'mensal' && (
              <div className="campo-grupo">
                <label className="campo-rotulo" htmlFor="conta-dia">Vence no dia</label>
                <input id="conta-dia" className="campo" inputMode="numeric" placeholder="5" value={f.diaVencimento} onChange={(e) => mexer('diaVencimento', e.target.value)} />
              </div>
            )}
            {f.tipo === 'periodico' && (
              <div className="campo-grupo">
                <label className="campo-rotulo" htmlFor="conta-intervalo">A cada (dias)</label>
                <input id="conta-intervalo" className="campo" inputMode="numeric" placeholder="15" value={f.intervalo} onChange={(e) => mexer('intervalo', e.target.value)} />
              </div>
            )}
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-inicio">Começa em</label>
              <input id="conta-inicio" type="date" className="campo" value={f.dataInicio} onChange={(e) => mexer('dataInicio', e.target.value)} />
            </div>
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="conta-fim">Termina</label>
              <select id="conta-fim" className="campo" value={f.fim} onChange={(e) => mexer('fim', e.target.value as Fim)}>
                <option value="nunca">Nunca</option>
                <option value="data">Em uma data</option>
                <option value="vezes">Depois de N cobranças</option>
              </select>
            </div>
          </div>

          {f.fim !== 'nunca' && (
            <div className="linha-campos">
              {f.fim === 'data' ? (
                <div className="campo-grupo">
                  <label className="campo-rotulo" htmlFor="conta-datafim">Última cobrança em</label>
                  <input id="conta-datafim" type="date" className="campo" value={f.dataFim} onChange={(e) => mexer('dataFim', e.target.value)} />
                </div>
              ) : (
                <div className="campo-grupo">
                  <label className="campo-rotulo" htmlFor="conta-repeticoes">Quantas cobranças</label>
                  <input id="conta-repeticoes" className="campo" inputMode="numeric" placeholder="12" value={f.repeticoes} onChange={(e) => mexer('repeticoes', e.target.value)} />
                </div>
              )}
            </div>
          )}

          <p className="nota" style={{ margin: 0 }}>
            {descrever(f)} · {f.tipo === 'imediato' ? `sai ${brl(Math.round(numero(f.valor) * 100))} uma vez` : `≈ ${brl(mensalPrevisto)}/mês`}
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="botao botao--primario botao--mini" onClick={salvar} disabled={!podeSalvar}>
              {editando ? 'Salvar alterações' : 'Adicionar'}
            </button>
            <button type="button" className="botao botao--mini" onClick={() => { setAberto(false); setEditando(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="custos__topo">
        <h2>Contas do mês</h2>
        <span className="nota">{(contas ?? []).length} conta(s)</span>
      </div>

      <div className="custos__lista">
        {(contas ?? []).map((conta) => (
          <div key={conta.id} className="custos__linha" style={{ gridTemplateColumns: '46px minmax(0,1fr) auto auto auto' }}>
            <span
              className={`custos__icone custos__icone--${conta.tipo}`}
              dangerouslySetInnerHTML={{ __html: svg(conta.icone) }}
            />
            <div className="custos__texto">
              <strong>{conta.nome}</strong>
              <span className="custos__cat">
                {conta.categoria} ·{' '}
                {descrever({
                  tipo: conta.tipo,
                  intervalo: String(conta.intervaloDias ?? 30),
                  diaVencimento: conta.diaVencimento ? String(conta.diaVencimento) : '',
                  dataInicio: conta.dataInicio,
                  fim: conta.dataFim ? 'data' : conta.repeticoes ? 'vezes' : 'nunca',
                  dataFim: conta.dataFim ?? '',
                  repeticoes: conta.repeticoes ? String(conta.repeticoes) : '',
                })}
                {!conta.vigente && ' · encerrada'}
              </span>
            </div>
            <strong className="custos__valor">{conta.tipo === 'imediato' ? brl(conta.valor) : brl(conta.mensalEquivalente)}</strong>
            <button type="button" className="icone-botao" aria-label={`Editar ${conta.nome}`} onClick={() => abrirEdicao(conta)}>
              <TbPencil size={18} />
            </button>
            <button type="button" className="custos__remover" aria-label={`Remover ${conta.nome}`} onClick={() => remover.mutate(conta.id)}>
              <TbTrash size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="custos__topo">
        <h2>Compras de insumo</h2>
        <span className="nota">{(compras ?? []).length} compra(s)</span>
      </div>

      <div className="custos__lista">
        {(compras ?? []).map((compra) => (
          <div key={compra.id} className="custos__linha">
            <span className="custos__icone custos__icone--imediato" dangerouslySetInnerHTML={{ __html: svg('outros') }} />
            <div className="custos__texto">
              <strong>{compra.ingrediente}</strong>
              <span className="custos__cat">
                {brl(compra.custoKgPago)}/kg · {compra.gramas} g · {compra.fornecedor ?? 'sem fornecedor'} ·{' '}
                {dataCurta(compra.compradaEm)}
              </span>
            </div>
            <strong className="custos__valor">{brl(compra.valorTotal)}</strong>
            <span />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PainelCustos;
