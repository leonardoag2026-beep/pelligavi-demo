import { el } from '../../shared/ui/dom.js';
import { brl } from '../../shared/format/format.js';
import { pedirCampos } from '../../shared/ui/dialogo.js';
import {
  carregarEquipe,
  criarFuncionario,
  removerFuncionario,
  type Funcionario,
} from '../../api/services/funcionarios.service.js';

const iniciais = (nome: string) => nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const CARGO: Record<string, string> = {
  atendente: 'Atendente',
  pizzaiolo: 'Pizzaiolo',
  entregador: 'Entregador',
  caixa: 'Caixa',
  gerente: 'Gerente',
};

export const renderFuncionarios = (alvo: any) => {
  const raiz = el('div', { class: 'func' });
  alvo.append(raiz);

  const desenhar = async () => {
    let equipe;
    try {
      equipe = await carregarEquipe();
    } catch {
      raiz.replaceChildren(el('p', { class: 'nota' }, 'Não consegui carregar a equipe agora.'));
      return;
    }
    const lista: Funcionario[] = equipe.itens;
    const folha = equipe.folha;

    const adicionar = async () => {
      const dados = await pedirCampos({
        titulo: 'Novo funcionário',
        campos: [
          { chave: 'nome', rotulo: 'Nome', dica: 'ex.: Carlos Silva' },
          { chave: 'turno', rotulo: 'Turno', dica: 'ex.: 17:00 - 23:30' },
          { chave: 'salario', rotulo: 'Salário mensal', dica: 'ex.: 2400', tipo: 'number' },
        ],
        rotuloOk: 'Adicionar',
      });
      if (!dados || !dados.nome) return;
      const salario = Math.round(Number(String(dados.salario).replace(',', '.')) * 100) || 0;
      await criarFuncionario({ nome: dados.nome, turno: dados.turno || '18:00 - 23:30', salario });
      await desenhar();
    };

    raiz.replaceChildren(
      el('header', { class: 'func__topo' }, [
        el('div', {}, [
          el('h2', {}, `Funcionários (${lista.length})`),
          el('span', { class: 'nota' }, `Folha mensal ${brl(folha)}`),
        ]),
      ]),
      el('ul', { class: 'func__lista' }, lista.map((f) => el('li', { class: 'func__linha' }, [
        el('span', { class: 'func__avatar' }, iniciais(f.nome)),
        el('div', { class: 'func__texto' }, [
          el('strong', {}, f.nome),
          el('span', { class: 'func__turno' }, `${CARGO[f.cargo] || f.cargo} · ${f.turno}`),
        ]),
        el('strong', { class: 'func__salario' }, brl(f.salario)),
        el('button', {
          type: 'button',
          class: 'func__remover',
          title: 'Remover',
          onclick: async () => {
            await removerFuncionario(f.id);
            await desenhar();
          },
        }, '✕'),
      ]))),
      el('button', { type: 'button', class: 'func__novo', onclick: adicionar }, 'Adicionar Funcionário'),
    );
  };

  void desenhar();
};
