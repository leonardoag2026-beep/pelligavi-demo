import { TbArrowLeft } from 'react-icons/tb';
import { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { useNavigate } from 'react-router-dom';
import { PizzaCanvas, type SecaoDaCena } from '../../features/montagem/components/pizza-canvas/pizza-canvas';
import { PizzaArt } from '../../features/montagem/components/pizza-art/pizza-art';
import { dadosCompletos } from '../../features/checkout/components/step-dados/step-dados';
import { StepDados } from '../../features/checkout/components/step-dados/step-dados';
import { StepConclusao } from '../../features/checkout/components/step-conclusao/step-conclusao';
import { StepPagamento } from '../../features/checkout/components/step-pagamento/step-pagamento';
import { CheckoutProvider, useCheckout, calcularTotais } from '../../features/checkout/context/checkout-context';
import { useGetCardapio } from '../../features/cardapio/hooks/cardapio-api.hooks';
import { useGetIngredientes, useGetRender } from '../../features/ingredientes/hooks/ingredientes-api.hooks';
import { useGetConfig } from '../../features/config/hooks/config-api.hooks';
import { useOrcamento } from '../../features/pedidos/hooks/pedidos-api.hooks';
import type { ItemPedidoEntrada } from '../../api/services/pedidos';
import { pecasDe } from '../../shared/config/pecas';
import { definirTipos, definirModelos, definirRenderParams, depurarModelos } from '../../shared/config/ingredientes';
import { definirRender } from '../../shared/config/render';
import { prepararModelos, exportarPeca, exportarTextura } from '../../shared/lib/pizza3d';
import { bebidaArt } from '../../shared/ui/art';
import { instalarCrm } from '../../shared/styles/crm';
import { miniatura } from '../../shared/ui/miniaturas';
import { brl } from '../../shared/utils/format';

const PASSOS = ['Tamanho', 'Ingredientes', 'Borda', 'Revisar', 'Acompanhamentos', 'Seus dados', 'Pagamento', 'Concluído'];
// o fator de preço por tamanho vem da API (tamanho.fator): nada de tabela fixa aqui

const trilha = css({
  display: 'flex',
  gap: '0.4rem',
  padding: '0 clamp(1rem, 3vw, 2rem) 0.2rem',
  overflowX: 'auto',
  listStyle: 'none',
  margin: 0,
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
});

const trilhaItem = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  padding: '0.42rem 0.8rem',
  borderRadius: 999,
  border: '1px solid rgba(244, 241, 234, 0.14)',
  cursor: 'pointer',
  fontSize: '0.79rem',
  color: 'rgba(244, 241, 234, 0.5)',
  whiteSpace: 'nowrap',
});

const trilhaAtivo = css({ background: 'var(--creme)', color: 'var(--ink)', borderColor: 'var(--creme)', fontWeight: 600 });
const trilhaFeito = css({ color: 'var(--creme)', borderColor: 'rgba(244, 241, 234, 0.38)' });
// passo ainda não alcançado: não dá para clicar e pular
const trilhaTravada = css({
  opacity: 0.38,
  cursor: 'not-allowed',
  '&:hover': { borderColor: 'rgba(244, 241, 234, 0.18)' },
});

const numeroTrilha = css({
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: 'rgba(244, 241, 234, 0.14)',
  display: 'grid',
  placeItems: 'center',
  fontSize: '0.64rem',
});

const casca = css({
  display: 'grid',
  gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
  minHeight: '100svh',
  background: 'radial-gradient(circle at 30% 18%, #17130f, #070706 68%)',
});

const corpoGrade = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.06fr) minmax(360px, 0.94fr)',
  gap: '1rem',
  padding: '0.8rem clamp(1rem, 3vw, 2rem) 1rem',
  alignItems: 'stretch',
  minHeight: 0,
  '@media (max-width: 960px)': { gridTemplateColumns: '1fr', gap: '0.8rem', padding: '0.6rem 0.85rem 1rem' },
});

const palcoCss = css({
  position: 'sticky',
  top: '1rem',
  height: 'calc(100svh - 210px)',
  minHeight: 260,
  borderRadius: 20,
  overflow: 'hidden',
  '@media (max-width: 960px)': { height: '38svh', minHeight: 220, position: 'relative', top: 0 },
});

const painelCss = css({
  display: 'grid',
  gap: '1.1rem',
  alignContent: 'start',
  minWidth: 0,
  height: '100%',
  overflowY: 'auto',
});

const navCss = css({
  position: 'sticky',
  bottom: 0,
  zIndex: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  minHeight: 80,
  padding: '0.7rem clamp(1rem, 3vw, 2rem) calc(0.7rem + env(safe-area-inset-bottom))',
  borderTop: '1px solid rgba(244, 241, 234, 0.10)',
  background: 'rgba(9, 9, 8, 0.96)',
  backdropFilter: 'blur(12px)',
});

const subtitulo = css({ fontFamily: 'var(--display)', fontSize: '1.08rem' });
const dica = css({ fontSize: '0.78rem', color: 'var(--ink-3)' });

const lista = css({ display: 'grid', gap: '0.35rem' });

const botaoPrimario = css({
  height: 46,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  padding: '0 1.4rem',
  borderRadius: 999,
  border: '1px solid transparent',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  ':disabled': { opacity: 0.45, cursor: 'not-allowed' },
  ':hover:not(:disabled)': { background: 'var(--accent-2)' },
});

const botaoFantasma = css({
  height: 46,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  padding: '0 1.1rem',
  color: 'var(--creme)',
  '@media (max-width: 480px)': { padding: '0 0.85rem', height: 44, fontSize: '0.82rem' },
  borderRadius: 999,
  border: '1px solid rgba(244, 241, 234, 0.24)',
  background: 'transparent',
  cursor: 'pointer',
});

const diagrama = (n: number) => {
  if (n === 1) return <circle cx="16" cy="16" r="13" fill="currentColor" opacity="0.22" />;
  const passo = (Math.PI * 2) / n;
  return Array.from({ length: n }, (_, i) => {
    const a = i * passo - Math.PI / 2;
    const x = 16 + 12 * Math.cos(a);
    const y = 16 + 12 * Math.sin(a);
    return <line key={i} x1="16" y1="16" x2={x} y2={y} stroke="currentColor" strokeWidth="1.6" opacity="0.5" />;
  });
};

const Conteudo: React.FC = () => {
  useEffect(() => {
    instalarCrm();
  }, []);

  const navigate = useNavigate();
  const checkout = useCheckout();
  const { data: cardapio } = useGetCardapio();
  const { data: ingredientes } = useGetIngredientes();
  const { data: config } = useGetConfig();
  const [passo, setPasso] = useState(0);
  // o trilho só volta até onde o cliente já chegou: clicar num passo futuro não pula validação
  const [alcancado, setAlcancado] = useState(0);
  const [avisoTrilha, setAvisoTrilha] = useState('');
  const [numeroConfirmado, setNumeroConfirmado] = useState('');
  const [totalConfirmado, setTotalConfirmado] = useState(0);
  const porcoes = useMemo(
    () => Object.fromEntries(checkout.extras.map((e) => [e.id, e.qtd])) as Record<string, number>,
    [checkout.extras],
  );

  const [presetAtivo, setPresetAtivo] = useState<string | null>(null);
  const [ordemPreset, setOrdemPreset] = useState<string[]>([]);
  const [parteAtiva, setParteAtiva] = useState(0);
  const [porcoesParte, setPorcoesParte] = useState<Record<number, Record<string, number>>>({});


  const definirPorcao = (item: { id: string; nome: string; preco: number }, qtd: number) => {
    if (dividida) {
      // cada parte tem a própria lista de porções
      setPorcoesParte((atual) => ({
        ...atual,
        [parteAtiva]: { ...(atual[parteAtiva] ?? {}), [item.id]: Math.max(0, qtd) },
      }));
      return;
    }
    setPresetAtivo(null); // mexeu na mão: deixa de ser o sabor pronto
    checkout.definirSabor(null);
    checkout.definirExtra({ id: item.id, nome: item.nome, preco: item.preco }, qtd);
  };

  // escolher o sabor de uma parte preenche os ingredientes dela, na ordem da receita
  const escolherSaborDaParte = (indice: number, id: string) => {
    const sabor = cardapio?.sabores.find((s) => s.id === id);
    if (!sabor || !ingredientes?.length) return;
    setSaboresParte((atual) => {
      const novo = [...atual];
      novo[indice] = id;
      return novo;
    });
    const porcoesNova: Record<string, number> = {};
    const ordem: string[] = [];
    // a receita vem do banco com as porções de cada ingrediente (sabor pre-made do CRM)
    const receita = sabor.receita?.length
      ? sabor.receita
      : (sabor.itens ?? []).map((id) => ({ id, porcoes: 1, gramas: 0 }));
    for (const item of receita) {
      const ing = ingredientes.find((i) => i.id === item.id);
      if (!ing) continue;
      porcoesNova[ing.id] = Math.max(1, item.porcoes);
      ordem.push(ing.id);
    }
    setPorcoesParte((atual) => ({ ...atual, [indice]: porcoesNova }));
    setOrdemPreset(ordem);
    setParteAtiva(indice);
  };
  const [partes, setPartes] = useState(1);
  const [saboresParte, setSaboresParte] = useState<(string | null)[]>([null, null, null, null]);

  const dividida = partes > 1;
  const porcoesDaSecao: Record<string, number> = (partes > 1 ? porcoesParte[parteAtiva] ?? {} : porcoes);
  const escolhidosPorParte = saboresParte.slice(0, partes);

  const fatorTamanho = checkout.tamanho?.fator ?? 1;
  const precoBase = Math.round((cardapio?.montagem.preco ?? 0) * fatorTamanho);
  const precoSabor =
    !dividida && checkout.sabor && checkout.tamanho ? checkout.sabor.precos[checkout.tamanho.id] ?? 0 : 0;

  const precoDividida = dividida
    ? Math.max(
        0,
        ...escolhidosPorParte
          .filter(Boolean)
          .map((id) => {
            const s = cardapio?.sabores.find((x) => x.id === id);
            return s && checkout.tamanho ? s.precos[checkout.tamanho.id] ?? 0 : 0;
          })
      ) || precoBase
    : precoSabor || precoBase;

  // pizza inteira: as porções mexidas viram `extras` no contexto (já somados em calcularTotais).
  // dividida: cada parte guarda as próprias porções, então o extra entra aqui, dividido por parte.
  const precoPorcoes = useMemo(() => {
    if (!dividida) return 0;
    let soma = 0;
    for (let parte = 0; parte < partes; parte += 1) {
      // parte com sabor pronto: o preço do sabor já cobre os ingredientes da receita
      if (saboresParte[parte]) continue;
      const mapa = porcoesParte[parte] ?? {};
      for (const [id, qtd] of Object.entries(mapa)) {
        const ing = ingredientes?.find((i) => i.id === id);
        if (!ing || !qtd) continue;
        soma += (ing.preco * qtd) / partes;
      }
    }
    return Math.round(soma);
  }, [dividida, partes, saboresParte, porcoesParte, ingredientes]);

  const precoPizza = precoDividida + precoPorcoes;
  const enderecoPronto = checkout.distancia !== null && checkout.distancia !== undefined;
  const totais = calcularTotais(checkout, config, precoPizza, precoBase, { comTaxa: enderecoPronto });

  // o pedido como o servidor entende: preço e desconto saem daqui, não do front
  const pedidoAtual = useMemo(() => {
    if (!checkout.tamanho) return null;
    const porcoesPedido: Record<string, number> = dividida
      ? Object.values(porcoesParte).reduce<Record<string, number>>((soma, mapa) => {
          for (const [slug, qtd] of Object.entries(mapa)) soma[slug] = (soma[slug] ?? 0) + qtd;
          return soma;
        }, {})
      : porcoes;
    return {
      tamanho: checkout.tamanho.id,
      // saboresParte é estado (identidade estável); escolhidosPorParte é um slice novo a cada
      // render e, usado como dependência, fazia este memo — e o efeito que publica — girar sem fim
      sabores: dividida
        ? saboresParte.slice(0, partes).filter((s): s is string => Boolean(s))
        : checkout.sabor
          ? [checkout.sabor.id]
          : [],
      borda: checkout.borda?.id ?? null,
      ingredientes: Object.entries(porcoesPedido)
        .filter(([, qtd]) => qtd > 0)
        .map(([slug, qtd]) => ({ slug, porcoes: qtd })),
      // parte montada à mão não tem sabor pronto: sem isso a pizza saía com o nome
      // de um sabor só e a cozinha não sabia o que ia na outra metade
      partes,
      partesInfo: dividida
        ? Array.from({ length: partes }, (_, indice) => ({
            sabor: saboresParte[indice] ?? null,
            ingredientes: Object.entries(porcoesParte[indice] ?? {})
              .filter(([, qtd]) => qtd > 0)
              .map(([slug, qtd]) => ({ slug, porcoes: qtd })),
          }))
        : undefined,
    };
  }, [checkout.tamanho, checkout.sabor, checkout.borda, dividida, partes, saboresParte, porcoes, porcoesParte]);

  const itensServidor = useMemo<ItemPedidoEntrada[]>(() => {
    const lista: ItemPedidoEntrada[] = [];
    if (pedidoAtual) lista.push({ tipo: 'pizza', ...pedidoAtual });
    checkout.bebidas.forEach((b) => lista.push({ tipo: 'bebida', slug: b.bebida.id, qtd: b.qtd }));
    return lista;
  }, [pedidoAtual, checkout.bebidas]);

  const { data: orcamento } = useOrcamento(itensServidor, checkout.modo);
  // preço da pizza sozinha (o resumo da montagem mostra ela, sem as bebidas)
  const precoDaPizza = orcamento
    ? (orcamento.itens.find((i) => i.tipo === 'pizza')?.preco ?? 0)
    : totais.pizza + totais.borda;
  // frete só aparece quando o endereço está válido, igual antes
  const exibir = orcamento
    ? enderecoPronto
      ? orcamento
      : { ...orcamento, taxa: 0, total: orcamento.subtotal - orcamento.desconto }
    : totais;

  // o pagamento não tem acesso às partes nem à receita: o estúdio publica o resultado
  const publicarMontada = checkout.definirMontada;
  const ultimaPublicacao = useRef('');
  useEffect(() => {
    if (!checkout.tamanho) {
      publicarMontada(null);
      return;
    }
    const tamanho = checkout.tamanho.nome.toLowerCase();
    const rotulo = dividida
      ? `Pizza ${partes} ${partes > 1 ? 'sabores' : 'sabor'} · ${tamanho}`
      : checkout.sabor
        ? `Pizza de ${checkout.sabor.nome.toLowerCase()} · ${tamanho}`
        : `Pizza montada · ${tamanho}`;
    if (!pedidoAtual) return;
    // publicar um objeto novo a cada render realimentava o contexto e travava o React
    const chave = JSON.stringify({ rotulo, preco: exibir.total, pedido: pedidoAtual });
    if (ultimaPublicacao.current === chave) return;
    ultimaPublicacao.current = chave;
    publicarMontada({ rotulo, preco: exibir.total, pedido: pedidoAtual });
  }, [publicarMontada, dividida, partes, checkout.sabor, checkout.tamanho, pedidoAtual, exibir.total]);

  const secoes = useMemo<SecaoDaCena[][]>(() => {
    const fator = checkout.tamanho?.fator ?? 1;
    const ehRodela = (id: string) => {
      const classe = ingredientes?.find((i) => i.id === id)?.classe;
      return classe === 'rodela' || classe === 'rodelas';
    };
    const pecas = (id: string, vezes = 1) =>
      (ehRodela(id) ? pecasDe(id) : Math.round(pecasDe(id) * fator)) * vezes;

    if (dividida) {
      const porParte = 1 / partes;
      return Array.from({ length: partes }, (_, indice) => {
        // o que foi ajustado à mão naquela parte tem prioridade sobre a receita pronta
        const proprias = Object.entries(porcoesParte[indice] ?? {}).filter(([, qtd]) => qtd > 0);
        if (proprias.length > 0) {
          return proprias.map(([id, qtd]) => ({
            nome: id,
            qtd: Math.max(1, ehRodela(id) ? Math.round(pecasDe(id) * porParte * qtd) : Math.round(pecasDe(id) * fator * porParte * qtd)),
          }));
        }
        const sabor = cardapio?.sabores.find((s) => s.id === saboresParte[indice]);
        if (!sabor) return [] as SecaoDaCena[];
        return sabor.itens.map((item) => ({
          nome: item,
          qtd: Math.max(1, ehRodela(item) ? Math.round(pecasDe(item) * porParte) : Math.round(pecasDe(item) * fator * porParte)),
        }));
      });
    }

    const escolhidos = Object.entries(porcoes).filter(([, qtd]) => qtd > 0);
    if (escolhidos.length > 0) {
      return [escolhidos.map(([id, qtd]) => ({ nome: id, qtd: pecas(id, qtd) }))];
    }
    const doSabor = checkout.sabor?.itens ?? [];
    if (doSabor.length === 0) return [[]];
    return [doSabor.map((id) => ({ nome: id, qtd: pecas(id) }))];
  }, [porcoes, porcoesParte, checkout.sabor, checkout.tamanho, dividida, partes, saboresParte, cardapio]);

  const trilhaRef = useRef<HTMLUListElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);
  const rodapeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const aplicar = () => {
      const topo = topoRef.current?.offsetHeight ?? 0;
      const rodape = rodapeRef.current?.offsetHeight ?? 0;
      if (topo > 0) raizRef.current?.style.setProperty('--altura-topo', `${topo}px`);
      if (rodape > 0) raizRef.current?.style.setProperty('--altura-rodape', `${rodape}px`);
    };
    aplicar();
    const observador = new ResizeObserver(aplicar);
    if (topoRef.current) observador.observe(topoRef.current);
    if (rodapeRef.current) observador.observe(rodapeRef.current);
    window.addEventListener('resize', aplicar);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', aplicar);
    };
  }, []);

  const { data: render } = useGetRender();

  useEffect(() => {
    if (!render?.length) return;
    const config: Record<string, { geometria: any; params: Record<string, any>; modelo?: string | null }> = {};
    const modelos: Record<string, { modelo?: string; textura?: string }> = {};
    const ajustes: Record<string, Record<string, any>> = {};
    for (const item of render) {
      const params = (item.params ?? {}) as Record<string, any>;
      config[item.id] = { geometria: item.geometria, params, modelo: item.modeloUrl };
      if (item.modeloUrl || item.texturaUrl) {
        modelos[item.id] = {
          modelo: item.modeloUrl ?? undefined,
          textura: item.texturaUrl ?? undefined,
        };
      }
      if (params && Object.keys(params).length) ajustes[item.id] = params;
    }
    definirRender(config);
    definirModelos(modelos);
    definirRenderParams(ajustes);
    if (typeof window !== 'undefined') {
      (window as any).__pzModelos = depurarModelos;
      (window as any).__pzExportar = exportarPeca;
      (window as any).__pzExportarTextura = exportarTextura;
    }

    // o motor lê STL de forma síncrona (data URL): baixa os arquivos do servidor
    // e registra de novo — peças criadas depois desse ponto já usam a malha
    let vivo = true;
    void (async () => {
      const prontos: Record<string, { modelo?: string; textura?: string }> = { ...modelos };
      await Promise.all(
        Object.entries(modelos).map(async ([id, m]) => {
          // só STL precisa virar data URL (o parser é síncrono); glb/gltf/obj/ply usam loader próprio
          if (!m.modelo || m.modelo.startsWith('data:') || !/\.stl($|\?)/i.test(m.modelo)) return;
          try {
            const resposta = await fetch(m.modelo);
            if (!resposta.ok) return;
            const bytes = new Uint8Array(await resposta.arrayBuffer());
            let binario = '';
            for (let i = 0; i < bytes.length; i += 0x8000) {
              binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            prontos[id] = { ...m, modelo: `data:model/stl;base64,${btoa(binario)}` };
          } catch {
            /* mantém procedural */
          }
        })
      );
      if (vivo) definirModelos(prontos);
      void prepararModelos(Object.values(prontos).map((m) => m.modelo ?? ''));
    })();

    return () => {
      vivo = false;
    };
  }, [render]);

  useEffect(() => {
    if (!ingredientes?.length) return;
    const mapa: Record<string, string> = {};
    for (const item of ingredientes) {
      const classe = String(item.classe ?? '').toLowerCase();
      if (classe === 'rodela' || classe === 'desfiado' || classe === 'espalhado' || classe === 'fio') mapa[item.id] = classe;
    }
    definirTipos(mapa);
  }, [ingredientes]);

  useEffect(() => {
    const lista = trilhaRef.current;
    const ativo = lista?.children[passo] as HTMLElement | undefined;
    if (!lista || !ativo) return;
    lista.scrollTo({ left: ativo.offsetLeft - lista.clientWidth / 2 + ativo.clientWidth / 2, behavior: 'smooth' });
  }, [passo]);

  const trocarPartes = (n: number) => {
    setPartes(n);
    setSaboresParte((atual) => atual.map((id, i) => (i < n ? id : null)));
    setPorcoesParte((atual) => {
      const novo: Record<number, Record<string, number>> = {};
      for (let i = 0; i < n; i += 1) if (atual[i]) novo[i] = atual[i];
      return novo;
    });
    setParteAtiva((atual) => (atual < n ? atual : 0));
  };

  // escolher um sabor pronto = preencher os ingredientes na ordem da receita
  const aplicarPreset = (id: string) => {
    const sabor = cardapio?.sabores.find((s) => s.id === id);
    if (!sabor || !ingredientes?.length) return;
    checkout.extras.forEach((extra) => checkout.definirExtra(extra, 0));
    checkout.definirSabor(sabor); // preço do cardápio; os itens do sabor não são cobrados de novo
    const ordem: string[] = [];
    const receita = sabor.receita?.length
      ? sabor.receita
      : (sabor.itens ?? []).map((item) => ({ id: item, porcoes: 1, gramas: 0 }));
    for (const item of receita) {
      const ing = ingredientes.find((i) => i.id === item.id);
      if (!ing) continue;
      checkout.definirExtra({ id: ing.id, nome: ing.nome, preco: ing.preco }, Math.max(1, item.porcoes));
      ordem.push(ing.id);
    }
    setOrdemPreset(ordem);
    setPresetAtivo(id);
  };

  const listaOrdenada = useMemo(() => {
    const todos = ingredientes ?? [];
    if (!ordemPreset.length) return todos;
    const posicao = new Map(ordemPreset.map((id, indice) => [id, indice]));
    return [...todos].sort((a, b) => (posicao.get(a.id) ?? 999) - (posicao.get(b.id) ?? 999));
  }, [ingredientes, ordemPreset]);

  // porção é da parte: numa pizza dividida em N cada pedaço leva 1/N do peso e do preço
  const fatorSecao = 1 / partes;
  const gramasNaSecao = Math.round(
    Object.entries(porcoesDaSecao).reduce((soma, [id, qtd]) => {
      const ing = ingredientes?.find((i) => i.id === id);
      return soma + (ing ? ing.gramas * qtd * fatorSecao : 0);
    }, 0),
  );

  const valorNaSecao = Math.round(
    Object.entries(porcoesDaSecao).reduce((soma, [id, qtd]) => {
      const ing = ingredientes?.find((i) => i.id === id);
      return soma + (ing ? ing.preco * qtd * fatorSecao : 0);
    }, 0),
  );

  const saborNome = dividida
    ? escolhidosPorParte
        .filter(Boolean)
        .map((id) => cardapio?.sabores.find((s) => s.id === id)?.nome)
        .filter(Boolean)
        .join(' + ') || 'montagem do zero'
    : checkout.sabor?.nome ?? 'montagem do zero';

  const temBase = Boolean(checkout.tamanho);
  const algumIngrediente = Object.values(porcoes).some((q) => q > 0) || Boolean(checkout.sabor);
  const parteCompleta = (indice: number) =>
    Boolean(saboresParte[indice]) || Object.values(porcoesParte[indice] ?? {}).some((q) => q > 0);
  const todasAsPartes = Array.from({ length: partes }, (_, i) => parteCompleta(i));
  const todasProntas = todasAsPartes.every(Boolean);
  const podeSeguir = (() => {
    // o sabor (ou a divisão em sabores) é escolhido no passo de ingredientes, não aqui
    if (passo === 0) return temBase;
    if (passo === 1) return dividida ? todasProntas : algumIngrediente;
    if (passo === 5) return dadosCompletos(checkout);
    return true;
  })();
  const proximaParte = passo === 1 && dividida && parteAtiva < partes - 1;
  const podeBotao = proximaParte ? parteCompleta(parteAtiva) : podeSeguir;

  const [aviso, setAviso] = useState('');
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(''), 3400);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const motivo = !podeSeguir
    ? passo === 0
      ? dividida
        ? 'Escolha o tamanho e um sabor para cada parte.'
        : 'Escolha o tamanho da pizza.'
      : passo === 1
        ? 'Escolha ao menos um ingrediente (ou um sabor pronto).'
        : 'Preencha nome, celular ou e-mail, e o endereço.'
    : '';

  return (
    <div className={[casca, 'estudio', passo >= 3 ? 'estudio--checkout' : ''].join(' ').trim()}>
      <>
        <header className="estudio__topo">
        <button type="button" className="botao botao--vidro botao--mini" onClick={() => navigate('/')}>
          <TbArrowLeft aria-hidden /> Loja
        </button>
        <div className="estudio__titulo" style={{ flex: 1, minWidth: 0 }}>
          <strong>Monte a sua pizza</strong>
          <span className={dica}>quantas pessoas e quantos sabores</span>
        </div>
          <span className="estudio__selo">3D ao vivo</span>
        </header>

        <ul className={trilha} ref={trilhaRef}>
        {PASSOS.map((nome, indice) => (
          <li
            key={nome}
            className={[
              trilhaItem,
              indice === passo ? trilhaAtivo : '',
              indice < passo ? trilhaFeito : '',
              indice > alcancado ? trilhaTravada : '',
            ].join(' ')}
            aria-disabled={indice > alcancado}
            title={indice > alcancado ? 'Complete este passo primeiro' : undefined}
            onClick={() => {
              if (indice > alcancado) {
                setAvisoTrilha(`Conclua o passo ${alcancado + 1} antes de ir para "${nome}".`);
                return;
              }
              setAvisoTrilha('');
              setPasso(indice);
            }}
          >
            <span className={numeroTrilha}>{indice + 1}</span>
            <span>{nome}</span>
          </li>
          ))}
        </ul>
      </>

      <div className={[corpoGrade, "estudio__corpo"].join(" ")}>
        <div className={[palcoCss, "estudio__palco"].join(" ")}>
          <PizzaCanvas
            tamanhoId={checkout.tamanho?.id ?? 'm'}
            partes={partes}
            bordaId={checkout.borda?.id ?? 'tradicional'}
            mostrarRecheio={passo === 2}
            secoes={secoes}
            variante="palco"
            fallback={<PizzaArt toppings={['calabresa', 'cebola', 'mussarela']} seed={9} />}
          />
          <span className="estudio__dica-giro">arraste para girar</span>
        </div>

        <aside className={[painelCss, 'estudio__painel', passo >= 3 ? 'checkout' : ''].join(' ').trim()}>
          {passo >= 3 && !numeroConfirmado && (
            <header className="etapa__cabecalho">
              <span className="etapa__indice">{passo === 3 ? 'Revisão do pedido' : `Passo ${passo - 3} de 3`}</span>
              <h2 className="etapa__titulo">
                {passo === 3
                  ? 'Confira a sua pizza'
                  : passo === 4
                    ? 'Quer algo para acompanhar?'
                    : passo === 5
                      ? 'Seus dados'
                      : 'Pagamento'}
              </h2>
              <p className="etapa__apoio">
                {passo === 3
                  ? 'Tamanho, sabor, borda e o que já entrou no pedido.'
                  : passo === 4
                    ? 'Refrigerante, suco, cerveja ou água — entra no mesmo pedido.'
                    : passo === 5
                      ? 'Quem recebe, onde e como o pedido chega.'
                      : 'PIX na hora, cartão de teste ou dinheiro na entrega.'}
              </p>
            </header>
          )}

          {passo === 0 && (
            <>
              <div>
                <h3 className={subtitulo}>Quantas pessoas?</h3>
                <p className={dica}>O tamanho muda a massa. Os sabores você escolhe aqui embaixo.</p>
                <div className="tamanhos" style={{ marginTop: '0.6rem' }}>
                  {(cardapio?.tamanhos ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={['tamanho-card', checkout.tamanho?.id === t.id ? 'tamanho-card--ativo' : ''].join(' ').trim()}
                      onClick={() => checkout.definirTamanho(t)}
                    >
                      <span className="tamanho-card__medida">{t.medida}</span>
                      <strong>{t.nome}</strong>
                      <span className="tamanho-card__fatias">{t.fatias} fatias</span>
                      <span className="tamanho-card__preco">{brl(Math.round((cardapio?.montagem.preco ?? 0) * (t.fator ?? 1)))}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="estudio__subtitulo">Dividir em quantos sabores?</h2>
                <p className="estudio__dica">Cada parte recebe os seus próprios ingredientes.</p>
                <div className="partes" style={{ marginTop: '0.5rem' }}>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={['parte-card', partes === n ? 'parte-card--ativo' : ''].join(' ').trim()}
                      onClick={() => trocarPartes(n)}
                    >
                      <span className="parte-card__diagrama">
                        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4">
                          {diagrama(n)}
                        </svg>
                      </span>
                      <strong>{n === 1 ? '1 sabor' : `${n} sabores`}</strong>
                      <span className="parte-card__corte">
                        {n === 1 ? 'inteira' : n === 2 ? 'meio a meio' : n === 3 ? 'três partes' : 'quatro partes'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </>
          )}

          {passo === 1 && (
            <div>
              <h3 className={subtitulo}>
                {dividida ? `Sabor da parte ${parteAtiva + 1} de ${partes}` : 'Começar de um sabor pronto'}
              </h3>
              <p className={dica}>
                {dividida
                  ? 'Escolher um sabor preenche os ingredientes desta parte, na ordem da receita.'
                  : 'Opcional. Escolher um sabor preenche os ingredientes na ordem da receita — dá para ajustar tudo abaixo.'}
              </p>
              {dividida ? (
                <>
                <div className="partes-abas" style={{ marginTop: '0.35rem' }}>
                  {Array.from({ length: partes }, (_, indice) => (
                    <button
                      key={indice}
                      type="button"
                      className={['partes-abas__aba', indice === parteAtiva ? 'partes-abas__aba--ativa' : ''].join(' ').trim()}
                      onClick={() => setParteAtiva(indice)}
                    >
                      Parte {indice + 1}
                      {parteCompleta(indice) ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
                <div className="sabores" style={{ marginTop: '0.4rem' }}>
                  {(cardapio?.sabores ?? []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={['sabor-chip', saboresParte[parteAtiva] === s.id ? 'sabor-chip--ativo' : ''].join(' ').trim()}
                      title={(s.itens ?? []).join(' · ')}
                      onClick={() => escolherSaborDaParte(parteAtiva, s.id)}
                    >
                      {s.nome}
                    </button>
                  ))}
                </div>
                </>
              ) : (
                <div className="sabores" style={{ marginTop: '0.4rem' }}>
                  {(cardapio?.sabores ?? []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={['sabor-chip', presetAtivo === s.id ? 'sabor-chip--ativo' : ''].join(' ').trim()}
                      title={(s.itens ?? []).join(' · ')}
                      onClick={() => aplicarPreset(s.id)}
                    >
                      {s.nome}
                    </button>
                  ))}
                </div>
              )}

              <h3 className={subtitulo} style={{ marginTop: '1rem' }}>Os ingredientes</h3>
              <p className={dica}>Mussarela de búfala já vai. Cada porção é a quantidade que cai na pizza.</p>
              <div className={lista} style={{ marginTop: '0.6rem' }}>
                {listaOrdenada.map((item) => (
                  <div
                    key={item.id}
                    data-id={item.id}
                    className={['ingrediente-linha', (porcoesDaSecao[item.id] ?? 0) > 0 ? 'ingrediente-linha--ativo' : ''].join(' ').trim()}
                  >
                    <button type="button" className="ingrediente-linha__corpo" onClick={() => definirPorcao(item, (porcoesDaSecao[item.id] ?? 0) + 1)}>
                      <img
                        className="ingrediente-linha__thumb"
                        src={(item as { imagem?: string | null }).imagem ?? miniatura(item.id)}
                        alt=""
                        width={30}
                        height={30}
                        loading="lazy"
                      />
                      <span className="ingrediente-linha__texto">
                        <span className="ingrediente-linha__nome">{item.nome}</span>
                        <span className="ingrediente-linha__unidade">
                          {Math.max(1, Math.round(item.gramas * fatorSecao))} g por porção
                          <span className="ingrediente-linha__preco"> · {brl(Math.max(1, Math.round(item.preco * fatorSecao)))}</span>
                        </span>
                      </span>
                      <span className="ingrediente-linha__marca">{(porcoesDaSecao[item.id] ?? 0) > 0 ? '✓' : '+'}</span>
                    </button>
                    {(porcoesDaSecao[item.id] ?? 0) > 0 ? (
                      <div className="contador-porcoes">
                        <button type="button" className="contador-porcoes__botao" aria-label="menos uma porção" onClick={() => definirPorcao(item, (porcoesDaSecao[item.id] ?? 0) - 1)}>−</button>
                        <span className="contador-porcoes__valor">
                          {porcoesDaSecao[item.id] ?? 0}×
                          <span className="contador-porcoes__gramas"> · {Math.round(item.gramas * (porcoesDaSecao[item.id] ?? 0) * fatorSecao)} g</span>
                        </span>
                        <button type="button" className="contador-porcoes__botao" aria-label="mais uma porção" onClick={() => definirPorcao(item, (porcoesDaSecao[item.id] ?? 0) + 1)}>+</button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="resumo-secao" style={{ marginTop: '0.7rem' }}>
                <span className="nota">{gramasNaSecao} g nesta parte</span>
                <strong>{brl(valorNaSecao)}</strong>
              </div>
            </div>
          )}

          {passo === 2 && (
            <section className="estudio__bloco">
              <h2>E a borda?</h2>
              <p className="estudio__dica">A massa é a mesma; o recheio da beirada muda a experiência.</p>
              <div className="bordas">
                <button
                  type="button"
                  className={['borda-card', !checkout.borda ? 'borda-card--ativo' : ''].join(' ').trim()}
                  onClick={() => checkout.definirBorda(null)}
                >
                  <strong>Tradicional</strong>
                  <span className="borda-card__preco">inclusa</span>
                  <span className="borda-card__recheio">borda simples</span>
                </button>
                {(cardapio?.bordas ?? []).filter((b) => b.preco > 0).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={['borda-card', checkout.borda?.id === b.id ? 'borda-card--ativo' : ''].join(' ').trim()}
                    onClick={() => checkout.definirBorda(b)}
                  >
                    <strong>{b.nome}</strong>
                    <span className="borda-card__preco">+ {brl(b.preco)}</span>
                    <span className="borda-card__recheio">recheio dentro da borda</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {passo >= 3 ? (
            <div className="etapa__grade">
              <div className="etapa__principal">
            {passo === 3 && (
              <section className="etapa__bloco">
                <h3 className="etapa__subtitulo">Confira o pedido</h3>
                <section className="escolhidos" style={{ color: '#f2efe8' }}>
                <h3 className="escolhidos__titulo">Já no pedido</h3>
                <ul className="escolhidos__lista" style={{ marginTop: '0.6rem' }}>
                  <li className="escolhidos__item">
                    <span className="escolhidos__nome">
                      <strong>Tamanho</strong>
                      <span className="escolhidos__detalhe">{checkout.tamanho ? `${checkout.tamanho.nome} · ${checkout.tamanho.medida}` : '—'}</span>
                    </span>
                  </li>
                  <li className="escolhidos__item">
                    <span className="escolhidos__nome">
                      <strong>{dividida ? `${partes} sabores` : 'Sabor'}</strong>
                      <span className="escolhidos__detalhe">{saborNome}</span>
                    </span>
                  </li>
                  <li className="escolhidos__item">
                    <span className="escolhidos__nome">
                      <strong>Borda</strong>
                      <span className="escolhidos__detalhe">{checkout.borda?.nome ?? 'tradicional'}</span>
                    </span>
                  </li>
                  {!dividida &&
                    Object.entries(porcoes)
                      .filter(([, qtd]) => qtd > 0)
                      .map(([id, qtd]) => (
                        <li key={id} className="escolhidos__item">
                          <span className="escolhidos__nome">
                            <strong>{ingredientes?.find((i) => i.id === id)?.nome ?? id}</strong>
                            <span className="escolhidos__detalhe">porção extra</span>
                          </span>
                          <span className="escolhidos__qtd">{qtd}×</span>
                        </li>
                      ))}
                  <li className="escolhidos__item">
                    <span className="escolhidos__nome">
                      <strong>Pizza</strong>
                      <span className="escolhidos__detalhe">massa, molho e borda</span>
                    </span>
                    <span className="escolhidos__valor">{brl(precoDaPizza)}</span>
                  </li>
                </ul>
                </section>
              </section>
            )}

            {passo === 4 && (
              <div className="bebidas">
                {(cardapio?.bebidas ?? []).map((bebida) => {
                  const qtd = checkout.bebidas.find((x) => x.bebida.id === bebida.id)?.qtd ?? 0;
                  return (
                    <div
                      key={bebida.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`adicionar ${bebida.nome}`}
                      className={['bebida', qtd > 0 ? 'bebida--dentro' : ''].join(' ').trim()}
                      // a garrafa inteira adiciona: antes só os +/− respondiam
                      onClick={() => checkout.definirBebida(bebida, qtd + 1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          checkout.definirBebida(bebida, qtd + 1);
                        }
                      }}
                    >
                      <span className="bebida__arte">
                        {bebida.imagem ? (
                          <img src={bebida.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: bebidaArt(bebida.arte) }} />
                        )}
                      </span>
                      <span className="bebida__texto">
                        <strong className="bebida__nome">{bebida.nome}</strong>
                        <span className="bebida__detalhe">{bebida.detalhe ?? ''}</span>
                      </span>
                      <span className="bebida__preco" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span>{brl(bebida.preco * Math.max(1, qtd))}</span>
                        <span className="bebida__contador" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="bebida__passo"
                            aria-label={`menos uma ${bebida.nome}`}
                            disabled={qtd === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              checkout.definirBebida(bebida, Math.max(0, qtd - 1));
                            }}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '1px solid #332f2b',
                              background: '#14120f',
                              color: qtd === 0 ? '#4a453f' : '#f2efe8',
                              cursor: qtd === 0 ? 'not-allowed' : 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            −
                          </button>
                          <span
                            className="bebida__qtd"
                            style={{ minWidth: '1ch', textAlign: 'center', fontSize: '0.82rem', color: qtd > 0 ? '#f7f4ee' : '#8b857c' }}
                          >
                            {qtd}
                          </span>
                          <button
                            type="button"
                            className="bebida__passo"
                            aria-label={`mais uma ${bebida.nome}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              checkout.definirBebida(bebida, qtd + 1);
                            }}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '1px solid #332f2b',
                              background: '#14120f',
                              color: '#f2efe8',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            +
                          </button>
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {passo === 5 && <StepDados />}
            {passo === 6 && (
              <StepPagamento
                aoConfirmar={(n) => {
                  // guarda o total antes do limpar(): a conclusão recalculava com o carrinho vazio
                  setTotalConfirmado(exibir.total);
                  setNumeroConfirmado(n);
                  setAlcancado(7);
                  setAvisoTrilha('');
                  setPasso(7);
                }}
              />
            )}
            {passo === 7 && (
              numeroConfirmado
                ? <StepConclusao numero={numeroConfirmado} total={totalConfirmado} retirada={checkout.modo === 'retirada'} />
                : (
                  <div>
                    <h3 className={subtitulo}>Pagamento não concluído</h3>
                    <p className={dica}>O pedido não foi para a cozinha. Volte ao pagamento para confirmar.</p>
                  </div>
                )
            )}
              </div>
            {passo >= 3 && (
              <aside className="pedido" style={{ color: '#f2efe8' }}>
                <h3 className="pedido__titulo">Seu pedido</h3>
                <ul className="pedido__itens">
                  <li className="pedido__item">
                    <span className="pedido__qtd">1×</span>
                    <span className="pedido__nome">Pizza {checkout.tamanho?.nome ?? ''}</span>
                    <span className="pedido__valor">{brl(precoDaPizza)}</span>
                  </li>
                  {Object.entries(porcoes)
                    .filter(([, qtd]) => qtd > 0)
                    .map(([id, qtd]) => {
                      const ing = ingredientes?.find((x) => x.id === id);
                      return (
                        <li key={id} className="pedido__item">
                          <span className="pedido__qtd">{qtd}×</span>
                          <span className="pedido__nome">{ing?.nome ?? id}</span>
                          <span className="pedido__valor">{brl((ing?.preco ?? 0) * qtd)}</span>
                        </li>
                      );
                    })}
                  {checkout.bebidas.map((b) => (
                    <li key={b.bebida.id} className="pedido__item">
                      <span className="pedido__qtd">{b.qtd}×</span>
                      <span className="pedido__nome">{b.bebida.nome}</span>
                      <span className="pedido__valor">{brl(b.bebida.preco * b.qtd)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pedido__contas">
                  <div className="pedido__linha"><span>Subtotal</span><span>{brl(exibir.subtotal)}</span></div>
                  <div className="pedido__linha">
                    <span>{checkout.modo === 'retirada' ? 'Retirada no balcão' : 'Entrega'}</span>
                    <span>
                      {exibir.taxa
                        ? brl(exibir.taxa)
                        : checkout.modo === 'entrega' && !enderecoPronto
                          ? 'a calcular com o endereço'
                          : 'grátis'}
                    </span>
                  </div>
                  {exibir.desconto > 0 && (
                    <div className="pedido__linha pedido__linha--desconto"><span>Desconto</span><span>− {brl(exibir.desconto)}</span></div>
                  )}
                  <div className="pedido__linha pedido__linha--total"><span>Total</span><span>{brl(exibir.total)}</span></div>
                </div>
                <p className="pedido__prazo">
                  {checkout.modo === 'retirada'
                    ? (config ? `${config.prazoRetiradaMin} a ${config.prazoRetiradaMax} min para retirar` : 'retirada no balcão')
                    : (config ? `${config.prazoEntregaMin} a ${config.prazoEntregaMax} min de entrega` : 'entrega')}
                </p>
              </aside>
            )}
            </div>
          ) : null}


        </aside>
      </div>

      {(aviso || avisoTrilha) && (
        <div className="estudio__aviso" role="status" aria-live="polite">
          {avisoTrilha || aviso}
        </div>
      )}

      <footer className={[navCss, "estudio__nav"].join(" ")}>
        <div className="estudio__totais">
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244, 241, 234, 0.5)' }}>
            Total
          </span>
          <strong>{brl(exibir.total)}</strong>
        </div>
        <div className="estudio__acoes">
          {passo > 0 && (
            <button type="button" className={botaoFantasma} onClick={() => { setAvisoTrilha(''); setPasso(passo - 1); }}>
              <TbArrowLeft aria-hidden /> Voltar
            </button>
          )}
          {/* no pagamento quem fecha o pedido é o botão do próprio passo */}
          {passo < 6 && (
            <button
              type="button"
              className={[botaoPrimario, podeBotao ? '' : 'botao--travado'].join(' ').trim()}
              aria-disabled={!podeBotao}
              onClick={() => {
                if (proximaParte) {
                  if (!parteCompleta(parteAtiva)) {
                    setAviso(`Escolha o sabor da parte ${parteAtiva + 1} ou adicione ingredientes.`);
                    return;
                  }
                  setParteAtiva(parteAtiva + 1);
                  return;
                }
                if (!podeSeguir) {
                  setAviso(motivo || 'Complete o passo para continuar.');
                  return;
                }
                setAlcancado((atual) => Math.max(atual, passo + 1));
                setAvisoTrilha('');
                setPasso(passo + 1);
              }}
            >
              {proximaParte ? (
                <>
                  <span className="rotulo-longo">Escolher parte {parteAtiva + 2}</span>
                  <span className="rotulo-curto">Parte {parteAtiva + 2} →</span>
                </>
              ) : (
                'Continuar'
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

const Montar: React.FC = () => (
  <CheckoutProvider>
    <Conteudo />
  </CheckoutProvider>
);

export default Montar;
