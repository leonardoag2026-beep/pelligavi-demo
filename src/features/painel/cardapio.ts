import { el, toast } from '../../shared/ui/dom.js';
import { pedirCampos } from '../../shared/ui/dialogo.js';
import { brl } from '../../shared/format/format.js';
import { catalogo, adicionar, remover, definirImagem, resetar } from '../../api/services/catalogo.service.js';
import { TIPOS, tipoDe } from '../../shared/config/ingredientes.js';

const SECOES = [
  { id: 'ingredientes', titulo: 'Ingredientes', rotulo: 'Adicionar ingrediente' },
  { id: 'tamanhos', titulo: 'Tamanhos de pizza', rotulo: 'Adicionar tamanho' },
  { id: 'bebidas', titulo: 'Bebidas', rotulo: 'Adicionar bebida' },
];

const iconePrato = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 3v8M5 3v8M9 3v8M7 11v10"/><path d="M17 3c-2 2-2 5 0 7v11"/></svg>';

const imagemDoItem = (item: any) => {
  if (!item.imagem) return el('span', { class: 'catalogo__img catalogo__img--vazia', html: iconePrato });
  if (String(item.imagem).startsWith('<svg')) return el('span', { class: 'catalogo__img', html: item.imagem });
  return el('img', { class: 'catalogo__img', src: item.imagem, alt: item.nome });
};

export const renderCardapio = (alvo: any) => {
  const raiz = el('div', { class: 'catalogo' });
  alvo.append(raiz);
  let aberto = 'ingredientes';

  const desenhar = () => {
    const dados = catalogo();
    raiz.replaceChildren(
      el('header', { class: 'catalogo__topo' }, [
        el('h2', {}, 'Cardápio'),
        el('button', {
          type: 'button', class: 'catalogo__reset',
          onclick: () => { resetar(); toast('Catálogo restaurado'); desenhar(); },
        }, 'Restaurar padrão'),
      ]),
      el('div', { class: 'catalogo__abas' }, SECOES.map((s) =>
        el('button', {
          type: 'button',
          class: `catalogo__aba ${aberto === s.id ? 'catalogo__aba--ativa' : ''}`,
          onclick: () => { aberto = s.id; desenhar(); },
        }, `${s.titulo} (${(dados as unknown as Record<string, any[]>)[s.id].length})`)
      )),
      ...SECOES.filter((s) => s.id === aberto).map((s) => {
        const lista = (dados as unknown as Record<string, any[]>)[s.id];
        return el('section', { class: 'catalogo__secao' }, [
          el('ul', { class: 'catalogo__lista' }, lista.map((item: any, indice: any) =>
            el('li', { class: 'catalogo__linha' }, [
              el('button', {
                type: 'button', class: 'catalogo__foto',
                title: 'Trocar imagem',
                onclick: () => escolherImagem(s.id, indice, desenhar),
              }, [imagemDoItem(item)]),
              el('div', { class: 'catalogo__texto' }, [
                el('strong', {}, item.nome),
                el('span', { class: 'catalogo__meta' },
                  s.id === 'tamanhos'
                    ? `${item.fatias || '-'} fatias${item.preco ? ` · ${brl(item.preco)}` : ''}`
                    : s.id === 'ingredientes'
                      ? [
                          item.preco ? brl(item.preco) : 'sem preço',
                          item.precoGrama ? `${brl(Math.round(item.precoGrama * 100000))}/kg` : '',
                          (item.classe || tipoDe(item.nome, item.nome)),
                          item.modelo ? 'modelo 3D' : '',
                        ].filter(Boolean).join(' · ')
                      : item.preco ? brl(item.preco) : 'sem preço'),
              ]),
              el('button', {
                type: 'button', class: 'catalogo__remover', title: 'Remover',
                onclick: () => { remover(s.id as any, indice); desenhar(); },
              }, '✕'),
            ])
          )),
          el('button', {
            type: 'button', class: 'catalogo__novo',
            onclick: () => criarItem(s.id, desenhar),
          }, [el('span', {}, '+'), el('span', {}, s.rotulo)]),
        ]);
      })
    );
  };

  desenhar();
};

const escolherImagem = (secao: any, indice: any, depois: any) => {
  const input = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  input.onchange = () => {
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => { definirImagem(secao as any, indice, String(leitor.result || '')); depois(); };
    leitor.readAsDataURL(arquivo);
    input.remove();
  };
  document.body.append(input);
  input.click();
};

const numero = (texto: any, padrao = 0) => {
  const valor = Number(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(valor) ? valor : padrao;
};

const criarIngrediente = async (depois: any) => {
  const dados = await pedirCampos({
    titulo: 'Novo ingrediente',
    rotuloOk: 'Adicionar',
    campos: [
      { chave: 'nome', rotulo: 'Nome', dica: 'ex.: Calabresa fatiada' },
      { chave: 'preco', rotulo: 'Preço da porção (R$)', dica: 'ex.: 10,00' },
      { chave: 'precoGrama', rotulo: 'Preço por grama (R$)', dica: 'ex.: 0,12' },
      { chave: 'p', rotulo: 'Porções na Pequena', tipo: 'number', valor: '1' },
      { chave: 'm', rotulo: 'Porções na Média', tipo: 'number', valor: '1' },
      { chave: 'g', rotulo: 'Porções na Grande', tipo: 'number', valor: '1' },
      {
        chave: 'classe', rotulo: 'Tipo', tipo: 'select', valor: 'espalhado',
        opcoes: TIPOS.map((t) => ({ valor: t.id, nome: `${t.nome} — ${t.descricao}` })),
      },
      {
        chave: 'modelo', rotulo: 'Modelo 3D (STL)', tipo: 'file', aceita: '.stl',
        nota: 'opcional — o STL vira a peça no montador',
      },
    ],
  });
  if (!dados || !dados.nome) return;
  adicionar('ingredientes', {
    nome: dados.nome,
    preco: Math.round(numero(dados.preco) * 100),
    imagem: '',
    tipo: 'ingrediente',
    classe: (dados.classe || 'espalhado') as any,
    precoGrama: numero(dados.precoGrama),
    porcoes: { p: numero(dados.p, 1), m: numero(dados.m, 1), g: numero(dados.g, 1) },
    modelo: dados.modelo || '',
  });
  depois();
};

const criarItem = async (secao: any, depois: any) => {
  if (secao === 'ingredientes') {
    await criarIngrediente(depois);
    return;
  }
  const rotulo = secao === 'bebidas' ? 'Nome da bebida' : 'Nome do tamanho';
  const campos = [
    { chave: 'nome', rotulo, dica: secao === 'bebidas' ? 'ex.: Guaraná 2 L' : 'ex.: Família' },
    { chave: 'preco', rotulo: 'Preço em reais', dica: 'ex.: 10,00' },
  ];
  if (secao === 'tamanhos') campos.push({ chave: 'fatias', rotulo: 'Fatias', dica: 'ex.: 8', tipo: 'number' } as any);
  const dados = await pedirCampos({ titulo: `Novo em ${secao}`, campos, rotuloOk: 'Adicionar' });
  if (!dados || !dados.nome) return;
  adicionar(secao, {
    nome: dados.nome,
    preco: Math.round(numero(dados.preco) * 100),
    fatias: secao === 'tamanhos' ? numero(dados.fatias, 8) : undefined,
    imagem: '',
    tipo: secao,
  });
  depois();
};
