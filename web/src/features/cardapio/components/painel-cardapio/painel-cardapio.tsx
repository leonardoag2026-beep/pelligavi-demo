import { useEffect, useMemo, useState } from 'react';
import {
  useCriarBebida,
  useCriarSabor,
  useCriarTamanho,
  useGetCardapio,
  useRemoverBebida,
  useRemoverSabor,
  useRemoverTamanho,
  useSalvarBebida,
  useSalvarSabor,
  useSalvarTamanho,
  useSabor,
} from '../../hooks/cardapio-api.hooks';
import {
  useDefinirClasse,
  useEnviarImagem,
  useCriarIngrediente,
  useRemoverIngrediente,
  useEnviarModelo,
  useEnviarTextura,
  useGetGeometrias,
  useGetIngredientes,
  useGetRender,
  useSalvarPeso,
  useSalvarRender,
} from '../../../ingredientes/hooks/ingredientes-api.hooks';
import { FichaSabor } from './ficha-sabor';
import { FichaIngrediente } from './ficha-ingrediente';
import type { Ingrediente } from '../../../../api/services/ingredientes';
import { TbPencil, TbPlus, TbTrash } from 'react-icons/tb';
import type { Descritor } from './campo-render';
import { definirModelos, definirRenderParams, definirTipos } from '../../../../shared/config/ingredientes';
import { prepararModelos } from '../../../../shared/lib/pizza3d';
import { useEnviarImagemBebida } from '../../hooks/cardapio-api.hooks';
import { brl } from '../../../../shared/utils/format';
import { miniatura } from '../../../../shared/ui/miniaturas';

type Aba = 'sabores' | 'ingredientes' | 'tamanhos' | 'bebidas';

function CardAcoes({ nome, aoEditar, aoExcluir }: { nome: string; aoEditar: () => void; aoExcluir: () => void }) {
  return (
    <span className="catalogo__acoes">
      <button type="button" className="catalogo__acao" title="Editar" aria-label={`Editar ${nome}`} onClick={aoEditar}>
        <TbPencil size={15} />
      </button>
      <button type="button" className="catalogo__acao catalogo__acao--perigo" title="Excluir" aria-label={`Excluir ${nome}`} onClick={aoExcluir}>
        <TbTrash size={15} />
      </button>
    </span>
  );
}



// medidas iniciais por geometria: trocar o tipo não pode deixar campo vazio


// campos que o motor 3D lê de ingrediente_render.params — cada um muda um aspecto do render
// liga/desliga o que vem do servidor: o procedural afinado continua sendo o padrão
const FLAGS_RENDER: Array<[string, string]> = [
  ['modelo', 'Usar modelo 3D enviado'],
  ['textura', 'Usar textura do servidor'],
  ['materialArquivo', 'Usar material do arquivo 3D'],
  ['tinta', 'Tingir a textura com a cor'],
];



const PADROES = [
  { valor: 'manchas', rotulo: 'Manchas' },
  { valor: 'veias', rotulo: 'Veias' },
  { valor: 'fibras', rotulo: 'Fibras' },
  { valor: 'tomate', rotulo: 'Tomate' },
  { valor: 'aneis', rotulo: 'Anéis' },
  { valor: 'argolas', rotulo: 'Argolas' },
  { valor: 'conchas', rotulo: 'Conchas' },
  { valor: 'laminas', rotulo: 'Lâminas' },
  { valor: 'folhas', rotulo: 'Folhas' },
  { valor: 'creme', rotulo: 'Creme' },
  { valor: 'ervas', rotulo: 'Ervas' },
  { valor: 'generico', rotulo: 'Genérico' },
] as const;


// receita da peça: o que reproduz o procedural a partir do banco
const RECEITA: Descritor[] = [
  { nome: 'tipo', rotulo: 'Geometria', tipo: 'opcao', opcoes: [], dica: 'malha da peça quando ela é feita pelo formulário (não vale para modelo enviado)' },
  { nome: 'padrao', rotulo: 'Padrão da textura', tipo: 'opcao', opcoes: PADROES, dica: 'desenho aplicado sobre a cor base' },
  { nome: 'raio', rotulo: 'Raio', tipo: 'numero', min: 0.005, max: 0.2, passo: 0.001 },
  { nome: 'altura', rotulo: 'Altura do disco', tipo: 'numero', min: 0.004, max: 0.06, passo: 0.001 },
  { nome: 'alt', rotulo: 'Altura do bloco', tipo: 'numero', min: 0.004, max: 0.08, passo: 0.001 },
  { nome: 'aresta', rotulo: 'Aresta (cubo)', tipo: 'numero', min: 0.01, max: 0.12, passo: 0.001 },
  { nome: 'esp', rotulo: 'Espessura do aro', tipo: 'numero', min: 0.002, max: 0.02, passo: 0.001 },
  { nome: 'comp', rotulo: 'Comprimento', tipo: 'numero', min: 0.03, max: 0.3, passo: 0.005 },
  { nome: 'larg', rotulo: 'Largura', tipo: 'numero', min: 0.02, max: 0.25, passo: 0.005 },
  { nome: 'prof', rotulo: 'Profundidade', tipo: 'numero', min: 0.01, max: 0.2, passo: 0.005 },
  { nome: 'imagem', rotulo: 'Imagem da face', tipo: 'texto', exemplo: 'tomate.png', dica: 'textura da face nas peças discoFoto' },
  { nome: 'particulaTamanho', rotulo: 'Tamanho do floco', tipo: 'numero', min: 0.02, max: 0.4, passo: 0.005 },
  { nome: 'particulaCor', rotulo: 'Cor do floco', tipo: 'cor' },
];

// renderização: escala, densidade e material
const RENDER: Descritor[] = [
  { nome: 'cor', rotulo: 'Cor base', tipo: 'cor', dica: 'tinge a textura do material' },
  { nome: 'escala', rotulo: 'Escala da peça', tipo: 'numero', min: 0.3, max: 2.5, passo: 0.05 },
  { nome: 'variacao', rotulo: 'Variação de tamanho', tipo: 'numero', min: 0, max: 0.8, passo: 0.02 },
  { nome: 'pecas', rotulo: 'Peças por porção', tipo: 'numero', min: 1, max: 60, passo: 1, dica: 'quantas peças caem a cada porção (a pizza inteira tem 8 pedaços)' },
  { nome: 'porcao', rotulo: 'Fios por peça', tipo: 'numero', min: 1, max: 240, passo: 1, dica: 'só para desfiado/ralado: quantos flocos cada peça solta' },
  { nome: 'faixas', rotulo: 'Faixas radiais', tipo: 'numero', min: 0, max: 6, passo: 1 },
  { nome: 'rugosidade', rotulo: 'Rugosidade', tipo: 'numero', min: 0, max: 1, passo: 0.02 },
  { nome: 'metalico', rotulo: 'Metálico', tipo: 'numero', min: 0, max: 1, passo: 0.02 },
  { nome: 'repeticao', rotulo: 'Repetição da textura', tipo: 'numero', min: 1, max: 40, passo: 1 },
];


// mesmo ícone de prato da tela antiga para item sem imagem
const IconePrato: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

const lerArquivo = (arquivo: File): Promise<string> =>
  new Promise((resolve) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ''));
    leitor.readAsDataURL(arquivo);
  });

export const PainelCardapio: React.FC = () => {
  const [aba, setAba] = useState<Aba>('sabores');
  const [novosArquivos, setNovosArquivos] = useState<{ modelo?: { nome: string; base64: string }; textura?: { nome: string; base64: string }; imagem?: { nome: string; base64: string } }>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const { data: cardapio } = useGetCardapio();
  const { data: ingredientes } = useGetIngredientes();
  const { data: render } = useGetRender();
  const salvarSabor = useSalvarSabor();
  const criarSabor = useCriarSabor();
  // item aberto pode ser ingrediente também: pedir /sabores/frango devolvia 404
  const { data: detalheSabor } = useSabor(aba === 'sabores' ? aberto : null);
  const salvarTamanho = useSalvarTamanho();
  const salvarRender = useSalvarRender();
  const salvarPeso = useSalvarPeso();
  const enviarModelo = useEnviarModelo();
  const enviarTextura = useEnviarTextura();
  const definirClasse = useDefinirClasse();
  const enviarImagem = useEnviarImagem();
  const removerIngrediente = useRemoverIngrediente();
  const criarIngrediente = useCriarIngrediente();
  const removerSabor = useRemoverSabor();
  const enviarImagemBebida = useEnviarImagemBebida();
  const criarBebida = useCriarBebida();
  const salvarBebida = useSalvarBebida();
  const removerBebida = useRemoverBebida();
  const criarTamanho = useCriarTamanho();
  const removerTamanho = useRemoverTamanho();
  const tamanhosDe = (cardapio?.tamanhos ?? []).map((t) => t.id);

  const excluirSabor = (slug: string, nome: string) => {
    const ok = window.confirm(`Excluir o sabor "${nome}"?\n\nEle sai do cardápio e do montador. Pedidos antigos mantêm o nome na comanda.`);
    if (ok) removerSabor.mutate(slug, { onSuccess: () => setAberto(null) });
  };

  const excluirIngrediente = (slug: string, nome: string) => {
    const ok = window.confirm(`Excluir o ingrediente "${nome}"?\n\nEle sai das receitas dos sabores que usam e some do montador.`);
    if (ok) removerIngrediente.mutate(slug, { onSuccess: () => setAberto(null) });
  };

  const excluirTamanho = (slug: string, nome: string) => {
    const ok = window.confirm(`Excluir o tamanho "${nome}"?\n\nSumindo do cardápio e da montagem. Tamanho já usado em pedido não pode sair.`);
    if (ok) removerTamanho.mutate(slug, { onSuccess: () => setAberto(null) });
  };

  const excluirBebida = (slug: string, nome: string) => {
    const ok = window.confirm(`Excluir a bebida "${nome}"?\n\nEla sai do cardápio e do checkout. Pedidos antigos mantêm o nome na comanda.`);
    if (ok) removerBebida.mutate(slug, { onSuccess: () => setAberto(null) });
  };

  const renderDe = useMemo(() => new Map((render ?? []).map((r) => [r.id, r])), [render]);

  // a prévia usa a mesma forja da montagem: precisa dos tipos, modelos e receitas da API
  useEffect(() => {
    if (!render?.length) return;
    const ajustes: Record<string, any> = {};
    const modelos: Record<string, { modelo?: string; textura?: string }> = {};
    for (const item of render) {
      ajustes[item.id] = item.params ?? {};
      if (item.modeloUrl || item.texturaUrl) {
        modelos[item.id] = { modelo: item.modeloUrl ?? undefined, textura: item.texturaUrl ?? undefined };
      }
    }
    definirRenderParams(ajustes);
    definirModelos(modelos);
    void prepararModelos(Object.values(modelos).map((m) => m.modelo ?? ''));
  }, [render]);

  useEffect(() => {
    if (!ingredientes?.length) return;
    const mapa: Record<string, string> = {};
    for (const item of ingredientes) mapa[item.id] = String(item.classe ?? '').toLowerCase();
    definirTipos(mapa);
  }, [ingredientes]);
  // catálogo de geometrias vem do servidor (tipos, medidas e valores padrão)
  const { data: geometrias = [] } = useGetGeometrias();
  const catalogo = useMemo(() => new Map(geometrias.map((g) => [g.tipo, g])), [geometrias]);
  const valor = (chave: string, padrao: string | number | boolean) => campos[chave] ?? texto(padrao);
  const guardar = (chave: string, v: string) => setCampos((a) => ({ ...a, [chave]: v }));
  const texto = (v: unknown) => String(v ?? '');
  const numero = (texto: string) => Math.round(Number(texto.replace(',', '.')) * 100);

  return (
    <>
      <div className="filtros">
        {([['sabores', 'Sabores'], ['ingredientes', 'Ingredientes'], ['tamanhos', 'Tamanhos'], ['bebidas', 'Bebidas']] as const).map(([id, nome]) => (
          <button key={id} type="button" className={['chip', aba === id ? 'chip--ativo' : ''].join(' ').trim()} onClick={() => { setAba(id); setAberto(null); }}>
            {nome}
          </button>
        ))}
      </div>

      <div className="pedidos pedidos--unico">
        <section className="catalogo__secao">
          <div className="catalogo__topo">
            <h2>{aba === 'sabores' ? 'Sabores' : aba === 'ingredientes' ? 'Ingredientes e peças 3D' : aba === 'tamanhos' ? 'Tamanhos' : 'Bebidas e adicionais'}</h2>
            {aba === 'sabores' && (
              <button type="button" className="botao botao--mini" onClick={() => setAberto('__novo')}>
                <TbPlus size={16} /> Novo sabor
              </button>
            )}
            {aba === 'bebidas' && (
              <button type="button" className="botao botao--mini" onClick={() => setAberto('__nova-bebida')}>
                <TbPlus size={16} /> Nova bebida
              </button>
            )}
            {aba === 'tamanhos' && (
              <button type="button" className="botao botao--mini" onClick={() => setAberto('__novo-tamanho')}>
                <TbPlus size={16} /> Novo tamanho
              </button>
            )}
            {aba === 'ingredientes' && (
              <button type="button" className="botao botao--mini" onClick={() => setAberto('__novo-ingrediente')}>
                <TbPlus size={16} /> Novo ingrediente
              </button>
            )}
          </div>

          <ul className="catalogo__lista">
            {aba === 'sabores' && (cardapio?.sabores ?? []).map((sabor) => (
              <li key={sabor.id} className="catalogo__item">
                <button type="button" className={['catalogo__linha', aberto === sabor.id ? 'catalogo__linha--ativo' : ''].join(' ').trim()} onClick={() => setAberto(sabor.id)}>
                  {sabor.imagem ? (
                    <img className="catalogo__img" src={sabor.imagem} alt={sabor.nome} loading="lazy" />
                  ) : (
                    <span className="catalogo__img catalogo__img--vazia"><IconePrato /></span>
                  )}
                  <span className="catalogo__texto">
                    <strong>{sabor.nome}</strong>
                    <span className="catalogo__precos">
                      {tamanhosDe.map((t) => (
                        <span key={t} className="catalogo__preco-pill">
                          <b>{t.toUpperCase()}</b> {brl(sabor.precos[t] ?? 0)}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
                <CardAcoes nome={sabor.nome} aoEditar={() => setAberto(sabor.id)} aoExcluir={() => excluirSabor(sabor.id, sabor.nome)} />
              </li>
            ))}

            {aba === 'ingredientes' && (ingredientes ?? []).map((item) => (
              <li key={item.id} className="catalogo__item">
                <button type="button" className={['catalogo__linha', aberto === item.id ? 'catalogo__linha--ativo' : ''].join(' ').trim()} onClick={() => setAberto(item.id)}>
                  <img className="catalogo__img" src={item.imagem ?? miniatura(item.id)} alt={item.nome} />
                  <span className="catalogo__texto">
                    <strong>{item.nome}</strong>
                    <span className="catalogo__meta">
                      {renderDe.get(item.id)?.geometria ?? 'auto'} · {item.gramas} g · {brl(item.preco)}
                    </span>
                  </span>
                </button>
                <CardAcoes nome={item.nome} aoEditar={() => setAberto(item.id)} aoExcluir={() => excluirIngrediente(item.id, item.nome)} />
              </li>
            ))}

            {aba === 'tamanhos' && (cardapio?.tamanhos ?? []).map((tamanho) => (
              <li key={tamanho.id} className="catalogo__item">
                <button type="button" className={['catalogo__linha', aberto === tamanho.id ? 'catalogo__linha--ativo' : ''].join(' ').trim()} onClick={() => setAberto(tamanho.id)}>
                  <span className="catalogo__img catalogo__img--vazia"><IconePrato /></span>
                  <span className="catalogo__texto">
                    <strong>{tamanho.nome}</strong>
                    <span className="catalogo__meta">{tamanho.medida} · {tamanho.fatias} fatias</span>
                  </span>
                </button>
                <CardAcoes nome={tamanho.nome} aoEditar={() => setAberto(tamanho.id)} aoExcluir={() => excluirTamanho(tamanho.id, tamanho.nome)} />
              </li>
            ))}

            {aba === 'bebidas' && (cardapio?.bebidas ?? []).map((bebida) => (
              <li key={bebida.id} className="catalogo__item">
                <button type="button" className={['catalogo__linha', aberto === bebida.id ? 'catalogo__linha--ativo' : ''].join(' ').trim()} onClick={() => setAberto(bebida.id)}>
                  {bebida.imagem ? (
                    <img className="catalogo__img" src={bebida.imagem} alt={bebida.nome} />
                  ) : (
                    <span className="catalogo__img catalogo__img--vazia"><IconePrato /></span>
                  )}
                  <span className="catalogo__texto">
                    <strong>{bebida.nome}</strong>
                    <span className="catalogo__meta">{bebida.detalhe} · {brl(bebida.preco)}</span>
                  </span>
                </button>
                <CardAcoes nome={bebida.nome} aoEditar={() => setAberto(bebida.id)} aoExcluir={() => excluirBebida(bebida.id, bebida.nome)} />
              </li>
            ))}
          </ul>
        </section>

        {aberto && (
          <div className="dlg__fundo" onClick={(e) => e.target === e.currentTarget && setAberto(null)}>
            <div className="dlg dlg--ficha">
              <header className="dlg__topo">
                <h2>
                  {aba === 'sabores' ? 'Sabor' : aba === 'ingredientes' ? 'Ingrediente' : aba === 'tamanhos' ? 'Tamanho' : 'Bebida'}
                </h2>
                <button type="button" className="dlg__x" onClick={() => setAberto(null)} aria-label="Fechar">
                  ✕
                </button>
              </header>
              <div className="dlg__corpo">

          {aberto && aba === 'sabores' && aberto === '__novo' && (
            <FichaSabor
              sabor={{ id: '', nome: '', ativo: true, precos: {}, receita: [] }}
              ingredientes={ingredientes ?? []}
              tamanhos={cardapio?.tamanhos ?? []}
              salvando={criarSabor.isPending}
              novo
              onSalvar={(dados) => criarSabor.mutate(dados, { onSuccess: () => setAberto(null) })}
            />
          )}

          {aberto && aba === 'sabores' && aberto !== '__novo' && detalheSabor && (
            <FichaSabor
              sabor={detalheSabor}
              ingredientes={ingredientes ?? []}
              tamanhos={cardapio?.tamanhos ?? []}
              salvando={salvarSabor.isPending}
              novo={false}
              onSalvar={(dados) => salvarSabor.mutate({ slug: detalheSabor.id, body: dados })}
              onExcluir={() => {
                const confirmar = window.confirm(
                  `Excluir o sabor "${detalheSabor.nome}"?\n\nEle sai do cardápio e do montador. Pedidos antigos mantêm o nome na comanda.`,
                );
                if (!confirmar) return;
                removerSabor.mutate(detalheSabor.id, { onSuccess: () => setAberto(null) });
              }}
            />
          )}

          {aba === 'ingredientes' && aberto && aberto !== '__novo-ingrediente' && (ingredientes ?? []).filter((i) => i.id === aberto).map((item) => {
            const cfg = renderDe.get(item.id);
            return (
              <FichaIngrediente
                key={item.id}
                prefixo={item.id}
                item={item}
                cfg={cfg}
                geometrias={geometrias}
                catalogo={catalogo}
                receitaCampos={RECEITA}
                renderCampos={RENDER}
                flags={FLAGS_RENDER}
                valor={valor}
                guardar={guardar}
                numero={numero}
                nome={valor(`${item.id}:nome`, item.nome)}
                aoMudarNome={(v) => guardar(`${item.id}:nome`, v)}
                modeloUrl={cfg?.modeloUrl}
                texturaUrl={cfg?.texturaUrl}
                imagemUrl={item.imagem}
                aoEnviarArquivo={(tipo, f) =>
                  void lerArquivo(f).then((b64) => {
                    if (tipo === 'modelo') enviarModelo.mutate({ slug: item.id, nome: f.name, base64: b64 });
                    if (tipo === 'textura') enviarTextura.mutate({ slug: item.id, nome: f.name, base64: b64 });
                    if (tipo === 'imagem') enviarImagem.mutate({ slug: item.id, nome: f.name, base64: b64 });
                  })
                }
                aoDefinirClasse={(classe) => definirClasse.mutate({ slug: item.id, classe })}
                aoSalvar={(params, gramas, precoKg) => {
                  salvarRender.mutate({ slug: item.id, body: { params } });
                  salvarPeso.mutate({ slug: item.id, gramas, precoKg });
                }}
                aoExcluir={() => {
                  const confirmar = window.confirm(
                    `Excluir o ingrediente "${item.nome}"?\n\nEle sai das receitas dos sabores que usam e some do montador. Pedidos antigos mantêm o nome na comanda.`,
                  );
                  if (!confirmar) return;
                  removerIngrediente.mutate(item.id, { onSuccess: () => setAberto(null) });
                }}
              />
            );
          })}

          {aberto === '__novo-ingrediente' && (
            <FichaIngrediente
              prefixo="novo"
              item={{ id: '', slug: '', nome: valor('novo:nome', ''), classe: 'espalhado', gramas: 40, preco: 0, preco_kg: 0, imagem: null } as unknown as Ingrediente}
              geometrias={geometrias}
              catalogo={catalogo}
              receitaCampos={RECEITA}
              renderCampos={RENDER}
              flags={FLAGS_RENDER}
              valor={valor}
              guardar={guardar}
              numero={numero}
              novo
              nome={valor('novo:nome', '')}
              aoMudarNome={(v) => guardar('novo:nome', v)}
              arquivosNovos={{
                modelo: novosArquivos.modelo?.nome,
                textura: novosArquivos.textura?.nome,
                imagem: novosArquivos.imagem?.nome,
              }}
              aoEnviarArquivo={(tipo, f) =>
                void lerArquivo(f).then((b64) => setNovosArquivos((atual) => ({ ...atual, [tipo]: { nome: f.name, base64: b64 } })))
              }
              aoDefinirClasse={() => undefined}
              salvando={criarIngrediente.isPending}
              aoSalvar={(params, gramas, precoKg) =>
                criarIngrediente.mutate(
                  {
                    nome: valor('novo:nome', '').trim(),
                    classe: valor('novo:classe', 'espalhado') as 'rodela' | 'desfiado' | 'espalhado' | 'fio',
                    tipo: valor('novo:tipo', 'disco'),
                    gramas_porcao: gramas || 40,
                    custo_kg: precoKg,
                    preco_porcao: Math.round((precoKg * (gramas || 40)) / 1000),
                    cor: valor('novo:cor', '#a9703a'),
                  },
                  {
                    onSuccess: (criado) => {
                      if (novosArquivos.modelo) enviarModelo.mutate({ slug: criado.id, nome: novosArquivos.modelo.nome, base64: novosArquivos.modelo.base64 });
                      if (novosArquivos.textura) enviarTextura.mutate({ slug: criado.id, nome: novosArquivos.textura.nome, base64: novosArquivos.textura.base64 });
                      if (novosArquivos.imagem) enviarImagem.mutate({ slug: criado.id, nome: novosArquivos.imagem.nome, base64: novosArquivos.imagem.base64 });
                      salvarRender.mutate({ slug: criado.id, body: { params } });
                      salvarPeso.mutate({ slug: criado.id, gramas, precoKg });
                      setNovosArquivos({});
                      setAberto(criado.id);
                    },
                  },
                )
              }
            />
          )}

          {aberto === '__novo-tamanho' && (
            <div className="pedido-detalhe">
              <header className="pedido-detalhe__topo"><div><span className="nota">novo tamanho</span><h2>Cadastrar tamanho</h2></div></header>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Nome</label>
                <input className="campo" placeholder="Família" value={valor('__novo-tamanho:nome', '')} onChange={(e) => guardar('__novo-tamanho:nome', e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Diâmetro (cm)</label>
                <input className="campo campo--preco" placeholder="50" value={valor('__novo-tamanho:cm', '')} onChange={(e) => guardar('__novo-tamanho:cm', e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Fatias</label>
                <input className="campo campo--preco" placeholder="16" value={valor('__novo-tamanho:fatias', '')} onChange={(e) => guardar('__novo-tamanho:fatias', e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Fator de preço</label>
                <input className="campo campo--preco" placeholder="2,10" value={valor('__novo-tamanho:fator', '')} onChange={(e) => guardar('__novo-tamanho:fator', e.target.value)} />
              </div>
              <p className="nota">O fator multiplica o preço base da montagem (P 1,00 · M 1,35 · G 1,78).</p>
              <div className="pedido-detalhe__acoes">
                <button
                  type="button"
                  className="botao botao--primario botao--mini"
                  disabled={criarTamanho.isPending || valor('__novo-tamanho:nome', '').trim().length < 2}
                  onClick={() =>
                    criarTamanho.mutate(
                      {
                        nome: valor('__novo-tamanho:nome', '').trim(),
                        diametro_cm: Number(valor('__novo-tamanho:cm', '0').replace(',', '.')),
                        fatias: Number(valor('__novo-tamanho:fatias', '0').replace(',', '.')),
                        fator: Number(valor('__novo-tamanho:fator', '1').replace(',', '.')),
                      },
                      { onSuccess: () => setAberto(null) },
                    )
                  }
                >
                  {criarTamanho.isPending ? 'Criando…' : 'Criar tamanho'}
                </button>
              </div>
            </div>
          )}

          {aberto && aba === 'tamanhos' && (cardapio?.tamanhos ?? []).filter((t) => t.id === aberto).map((tamanho) => (
            <div key={tamanho.id} className="pedido-detalhe">
              <header className="pedido-detalhe__topo"><div><span className="nota">tamanho</span><h2>{tamanho.nome}</h2></div></header>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Nome</label>
                <input className="campo" value={valor(`${tamanho.id}:nome`, tamanho.nome)} onChange={(e) => guardar(`${tamanho.id}:nome`, e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Diâmetro (cm)</label>
                <input className="campo campo--preco" value={valor(`${tamanho.id}:cm`, tamanho.medida.replace(' cm', ''))} onChange={(e) => guardar(`${tamanho.id}:cm`, e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Fatias</label>
                <input className="campo campo--preco" value={valor(`${tamanho.id}:fatias`, tamanho.fatias)} onChange={(e) => guardar(`${tamanho.id}:fatias`, e.target.value)} />
              </div>
              <div className="pedido-detalhe__acoes">
                <button type="button" className="botao botao--primario botao--mini" onClick={() => salvarTamanho.mutate({ slug: tamanho.id, body: { nome: valor(`${tamanho.id}:nome`, tamanho.nome), diametro_cm: Number(valor(`${tamanho.id}:cm`, tamanho.medida.replace(' cm', ''))), fatias: Number(valor(`${tamanho.id}:fatias`, tamanho.fatias)) } })}>
                  Salvar
                </button>
                <button type="button" className="botao botao--perigo botao--mini" onClick={() => excluirTamanho(tamanho.id, tamanho.nome)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}

          {aberto === '__nova-bebida' && (
            <div className="pedido-detalhe">
              <header className="pedido-detalhe__topo"><div><span className="nota">nova bebida</span><h2>Cadastrar bebida</h2></div></header>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Nome</label>
                <input className="campo" placeholder="Coca-Cola lata" value={valor('__nova-bebida:nome', '')} onChange={(e) => guardar('__nova-bebida:nome', e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Volume / detalhe</label>
                <input className="campo" placeholder="lata 350 ml" value={valor('__nova-bebida:detalhe', '')} onChange={(e) => guardar('__nova-bebida:detalhe', e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Preço (R$)</label>
                <input className="campo campo--preco" placeholder="7,50" value={valor('__nova-bebida:preco', '')} onChange={(e) => guardar('__nova-bebida:preco', e.target.value)} />
              </div>
              <div className="pedido-detalhe__acoes">
                <button
                  type="button"
                  className="botao botao--primario botao--mini"
                  disabled={criarBebida.isPending || valor('__nova-bebida:nome', '').trim().length < 2}
                  onClick={() =>
                    criarBebida.mutate(
                      {
                        nome: valor('__nova-bebida:nome', '').trim(),
                        detalhe: valor('__nova-bebida:detalhe', '').trim(),
                        preco: numero(valor('__nova-bebida:preco', '0')),
                      },
                      { onSuccess: () => setAberto(null) },
                    )
                  }
                >
                  {criarBebida.isPending ? 'Criando…' : 'Criar bebida'}
                </button>
              </div>
            </div>
          )}

          {aberto && aba === 'bebidas' && (cardapio?.bebidas ?? []).filter((b) => b.id === aberto).map((bebida) => (
            <div key={bebida.id} className="pedido-detalhe">
              <header className="pedido-detalhe__topo"><div><span className="nota">bebida</span><h2>{bebida.nome}</h2></div></header>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                {bebida.imagem ? (
                  <img src={bebida.imagem} alt={bebida.nome} width={72} height={72} style={{ borderRadius: 10, objectFit: 'cover' }} />
                ) : (
                  <span className="nota">sem imagem</span>
                )}
                <label className="botao botao--vidro botao--mini" style={{ cursor: 'pointer' }}>
                  Enviar imagem
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void lerArquivo(f).then((b64) => enviarImagemBebida.mutate({ slug: bebida.id, nome: f.name, base64: b64 })); e.target.value = ''; }} />
                </label>
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Nome</label>
                <input className="campo" value={valor(`${bebida.id}:nome`, bebida.nome)} onChange={(e) => guardar(`${bebida.id}:nome`, e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Volume / detalhe</label>
                <input className="campo" value={valor(`${bebida.id}:detalhe`, bebida.detalhe ?? '')} onChange={(e) => guardar(`${bebida.id}:detalhe`, e.target.value)} />
              </div>
              <div className="campo-grupo__linha campo-grupo">
                <label className="campo-rotulo">Preço (R$)</label>
                <input className="campo campo--preco" value={valor(`${bebida.id}:u`, (bebida.preco / 100).toFixed(2).replace('.', ','))} onChange={(e) => guardar(`${bebida.id}:u`, e.target.value)} />
              </div>
              <div className="pedido-detalhe__acoes">
                <button
                  type="button"
                  className="botao botao--primario botao--mini"
                  onClick={() =>
                    salvarBebida.mutate({
                      slug: bebida.id,
                      body: {
                        nome: valor(`${bebida.id}:nome`, bebida.nome).trim(),
                        detalhe: valor(`${bebida.id}:detalhe`, bebida.detalhe ?? '').trim(),
                        preco: numero(valor(`${bebida.id}:u`, (bebida.preco / 100).toFixed(2).replace('.', ','))),
                      },
                    })
                  }
                >
                  Salvar
                </button>
                <button type="button" className="botao botao--perigo botao--mini" onClick={() => excluirBebida(bebida.id, bebida.nome)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
