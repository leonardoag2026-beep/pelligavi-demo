import { el } from '../../shared/ui/dom.js';
import { brl } from '../../shared/format/format.js';
import { pedirCampos } from '../../shared/ui/dialogo.js';

interface Conta {
  id: number;
  nome: string;
  categoria: string;
  valor: number;
  tipo: string;
  intervaloDias: number | null;
  icone: string;
  mensalEquivalente: number;
}

const ICONES: Record<string, string> = {
  aluguel: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  luz: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z"/>',
  internet: '<path d="M4 10a12 12 0 0116 0"/><path d="M7 13a8 8 0 0110 0"/><path d="M10 16a4 4 0 014 0"/><circle cx="12" cy="19" r="1"/>',
  gas: '<path d="M8 3h8v4H8z"/><path d="M9 7v4a4 4 0 004 4v6"/>',
  outros: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
};
const svg = (k: any) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONES[k] || ICONES.outros}</svg>`;

// as contas vivem no banco (custo_conta) e chegam por carregarCustos()
const CONTAS: Conta[] = [];

const trocar = (lista: Conta[]): void => {
  CONTAS.splice(0, CONTAS.length, ...lista);
};

export const carregarCustos = async (): Promise<void> => {
  const resposta = await fetch('/api/custos/contas', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /custos/contas: ${resposta.status}`);
  trocar((await resposta.json()) as Conta[]);
};

const ler = (): Conta[] => CONTAS;

const criar = async (dados: { nome: string; categoria: string; valor: number; tipo: string; intervaloDias: number | null }) => {
  const resposta = await fetch('/api/custos/contas', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, icone: 'outros' }),
  });
  if (resposta.ok) await carregarCustos();
};

const remover = async (id: number) => {
  const resposta = await fetch(`/api/custos/contas/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  if (resposta.ok) await carregarCustos();
};

const mensalEquivalente = (c: any) => {
  if (c.tipo === 'mensal') return c.valor;
  if (c.tipo === 'periodico') return Math.round((c.valor * 30) / Math.max(1, c.dias || 7));
  return 0;
};

export const renderCustos = (alvo: any) => {
  const raiz = el('div', { class: 'custos' });
  alvo.append(raiz);

  const desenhar = () => {
    const lista = ler();
    const total = lista.reduce((s, c) => s + (c.mensalEquivalente ?? mensalEquivalente(c)), 0);
    const imediatos = lista.filter((c) => c.tipo === 'imediato').reduce((s, c) => s + c.valor, 0);

    const adicionar = async () => {
      const dados = await pedirCampos({
        titulo: 'Nova conta',
        campos: [
          { chave: 'nome', rotulo: 'Nome', dica: 'ex.: Conta de luz' },
          { chave: 'categoria', rotulo: 'Tipo / categoria', dica: 'ex.: Energia elétrica' },
          { chave: 'valor', rotulo: 'Valor em reais', dica: 'ex.: 680,00' },
          { chave: 'tipo', rotulo: 'Tipo: mensal, imediato ou periodico', valor: 'mensal' },
          { chave: 'dias', rotulo: 'Se periódico, a cada quantos dias', dica: 'ex.: 7' },
        ],
        rotuloOk: 'Adicionar',
      });
      if (!dados || !dados.nome) return;
      const tipo = ['mensal', 'imediato', 'periodico'].includes(dados.tipo) ? dados.tipo : 'mensal';
      await criar({
        nome: dados.nome,
        categoria: dados.categoria || 'Outros',
        valor: Math.round(Number(String(dados.valor || '0').replace(',', '.')) * 100) || 0,
        tipo,
        intervaloDias: tipo === 'periodico' ? Number(dados.dias || 7) : null,
      });
      desenhar();
    };

    raiz.replaceChildren(
      el('header', { class: 'custos__topo' }, [
        el('div', {}, [
          el('h2', {}, 'Custos'),
          el('span', { class: 'nota' }, `Equivalente mensal ${brl(total)}`),
        ]),
        el('div', { class: 'custos__resumo' }, [
          el('span', {}, `Imediatos ${brl(imediatos)}`),
        ]),
      ]),
      el('ul', { class: 'custos__lista' }, lista.map((c, i) =>
        el('li', { class: 'custos__linha' }, [
          el('span', { class: `custos__icone custos__icone--${c.tipo}`, html: svg(c.icone) }),
          el('div', { class: 'custos__texto' }, [
            el('strong', {}, c.nome),
            el('span', { class: 'custos__cat' },
              c.tipo === 'periodico'
                ? `${c.categoria} · a cada ${c.intervaloDias || 7} dias`
                : c.tipo === 'imediato' ? `${c.categoria} · uma vez` : c.categoria),
          ]),
          el('strong', { class: 'custos__valor' }, brl(c.valor)),
          el('button', {
            type: 'button', class: 'custos__remover',
            onclick: () => { void remover(c.id).then(desenhar); },
          }, '✕'),
        ])
      )),
      el('button', { type: 'button', class: 'custos__novo', onclick: adicionar }, 'Adicionar Conta'),
    );
  };

  desenhar();
};
