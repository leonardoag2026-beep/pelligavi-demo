import { el, limpar, toast } from '../../shared/ui/dom.js';
import { confirmar, pedirCampos } from '../../shared/ui/dialogo.js';
import { brl, data } from '../../shared/format/format.js';
import { listar, anonimizar, salvarCliente } from '../../api/services/clientes.service.js';
import { listar as pedidos } from '../../api/services/orders.service.js';

export const renderClientes = (alvo: any) => {
  const corpo = el('div', { class: 'clientes' });
  const busca = el('input', { class: 'campo', type: 'search', placeholder: 'Buscar por nome ou telefone' });
  let selecionado: any = null;

  const desenhar = () => {
    limpar(corpo);
    const lista = listar(busca.value);
    const alvoCliente = selecionado ? lista.find((c) => c.id === selecionado) : null;

    corpo.append(
      el('div', { class: 'clientes__lista' }, [
        el('ul', { class: 'pedidos__itens' }, lista.map((c) =>
          el('li', {}, [
            el('button', {
              type: 'button',
              class: `pedido-linha ${c.id === selecionado ? 'pedido-linha--ativo' : ''}`,
              onclick: async () => { selecionado = c.id; desenhar(); },
            }, [
              el('span', { class: 'pedido-linha__canal', style: { '--canal': c.anonimizado ? '#7a736a' : '#4a7a55' } }, c.anonimizado ? 'LGPD' : 'OK'),
              el('span', { class: 'pedido-linha__cliente' }, [
                el('strong', {}, c.nome),
                el('span', { class: 'nota' }, c.anonimizado ? 'anonimizado' : `${c.telefone || 'sem telefone'} · ${c.enderecos.length} endereço(s)`),
              ]),
              el('span', { class: 'nota' }, data(c.criadoEm)),
            ]),
          ])
        )),
        lista.length ? null : el('p', { class: 'nota' }, 'Nenhum cliente encontrado.'),
      ]),
      el('aside', { class: 'pedidos__detalhe' },
        alvoCliente
          ? [
              el('div', { class: 'pedido-detalhe' }, [
                el('header', { class: 'pedido-detalhe__topo' }, [
                  el('div', {}, [
                    el('span', { class: 'nota' }, 'cliente'),
                    el('h2', {}, alvoCliente.nome),
                  ]),
                ]),
                el('dl', { class: 'pedido-detalhe__dados' }, [
                  el('dt', {}, 'Telefone'), el('dd', {}, alvoCliente.telefone || '—'),
                  el('dt', {}, 'Cadastro'), el('dd', {}, data(alvoCliente.criadoEm)),
                  el('dt', {}, 'Endereços'), el('dd', {}, alvoCliente.enderecos.join(' · ') || '—'),
                  el('dt', {}, 'Pedidos'), el('dd', {}, String(pedidos().filter((p) => p.cliente?.nome === alvoCliente.nome).length)),
                ]),
                el('div', { class: 'pedido-detalhe__acoes' }, [
                  el('button', {
                    type: 'button', class: 'botao botao--perigo botao--mini',
                    disabled: alvoCliente.anonimizado,
                    onclick: async () => {
                      if (!(await confirmar({ titulo: 'Anonimizar cliente', texto: 'Apagar os dados pessoais deste cliente (LGPD)? Os pedidos continuam, sem identificação.', rotuloOk: 'Anonimizar' }))) return;
                      void anonimizar(alvoCliente.id).then(() => desenhar());
                      toast('Dados pessoais removidos; pedidos preservados');
                      desenhar();
                    },
                  }, alvoCliente.anonimizado ? 'Já anonimizado' : 'Anonimizar (LGPD)'),
                ]),
              ]),
            ]
          : el('div', { class: 'pedidos__vazio' }, [el('strong', {}, 'Escolha um cliente'), el('span', { class: 'nota' }, 'para ver os dados e anonimizar')])
      )
    );
  };

  busca.oninput = desenhar;

  alvo.append(
    el('div', { class: 'clientes-topo' }, [
      busca,
      el('button', {
        type: 'button', class: 'botao botao--fantasma botao--mini',
        onclick: async () => {
          const dados = await pedirCampos({ titulo: 'Novo cliente', campos: [
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'telefone', rotulo: 'Telefone (opcional)' },
            { chave: 'endereco', rotulo: 'Endereço' },
          ], rotuloOk: 'Adicionar' });
          const nome = dados?.nome;
          if (!nome) return;
          const telefone = dados?.telefone || '';
          const endereco = dados?.endereco || '';
          try {
            void salvarCliente({ nome, telefone, enderecos: endereco ? [endereco] : [] }).then(() => desenhar());
            toast('Cliente cadastrado');
            desenhar();
          } catch (e) {
            toast(e instanceof Error ? e.message : String(e));
          }
        },
      }, '+ Novo cliente'),
    ]),
    corpo
  );
  desenhar();
};
