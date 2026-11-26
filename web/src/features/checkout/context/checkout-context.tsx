import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Bebida, Borda, Sabor, Tamanho } from '../../../api/services/cardapio';
import type { FaixaDesconto, LojaConfig } from '../../../api/services/config';

export interface BebidaEscolhida {
  bebida: Bebida;
  qtd: number;
}

export interface ExtraEscolhido {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
}

// a pizza que o estúdio montou: o passo de pagamento não refaz a conta nem o nome,
// e a pizza dividida em sabores só existe aqui (o contexto não guarda as partes)
export interface PizzaMontada {
  rotulo: string;
  preco: number;
  // o pedido em si (o que vai para o servidor precificar) — o pagamento não vê as partes
  pedido: {
    tamanho: string;
    sabores: string[];
    borda: string | null;
    ingredientes: { slug: string; porcoes: number }[];
  };
}

export interface DadosEntrega {
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
}

interface CheckoutValor {
  modo: 'entrega' | 'retirada';
  tamanho: Tamanho | null;
  sabor: Sabor | null;
  borda: Borda | null;
  bebidas: BebidaEscolhida[];
  extras: ExtraEscolhido[];
  dados: DadosEntrega;
  distancia: { distanciaKm: number; raioKm: number; dentro: boolean } | null;
  definirDistancia: (d: { distanciaKm: number; raioKm: number; dentro: boolean } | null) => void;
  contatoToken: string | null;
  definirContato: (token: string | null) => void;
  montada: PizzaMontada | null;
  definirMontada: (pizza: PizzaMontada | null) => void;
  definirModo: (modo: 'entrega' | 'retirada') => void;
  definirTamanho: (tamanho: Tamanho) => void;
  definirSabor: (sabor: Sabor | null) => void;
  definirBorda: (borda: Borda | null) => void;
  definirBebida: (bebida: Bebida, qtd: number) => void;
  definirExtra: (extra: Omit<ExtraEscolhido, 'qtd'>, qtd: number) => void;
  definirDados: (dados: Partial<DadosEntrega>) => void;
  limpar: () => void;
}

const DADOS_VAZIOS: DadosEntrega = {
  nome: '', telefone: '', email: '', cep: '', rua: '', numero: '', complemento: '', bairro: '',
};

const CheckoutContext = createContext<CheckoutValor | null>(null);

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modo, setModo] = useState<'entrega' | 'retirada'>('entrega');
  const [tamanho, setTamanho] = useState<Tamanho | null>(null);
  const [sabor, setSabor] = useState<Sabor | null>(null);
  const [borda, setBorda] = useState<Borda | null>(null);
  const [bebidas, setBebidas] = useState<BebidaEscolhida[]>([]);
  const [extras, setExtras] = useState<ExtraEscolhido[]>([]);
  const [dados, setDados] = useState<DadosEntrega>(DADOS_VAZIOS);
  const [contatoToken, setContatoToken] = useState<string | null>(null);
  const [distancia, setDistancia] = useState<{ distanciaKm: number; raioKm: number; dentro: boolean } | null>(null);
  const [montada, setMontada] = useState<PizzaMontada | null>(null);

  const valor = useMemo<CheckoutValor>(
    () => ({
      modo,
      tamanho,
      sabor,
      borda,
      bebidas,
      extras,
      dados,
      distancia,
      definirDistancia: setDistancia,
      contatoToken,
      definirContato: setContatoToken,
      montada,
      definirMontada: setMontada,
      definirModo: setModo,
      definirTamanho: setTamanho,
      definirSabor: setSabor,
      definirBorda: setBorda,
      definirBebida: (bebida, qtd) =>
        setBebidas((atual) => {
          const sem = atual.filter((b) => b.bebida.id !== bebida.id);
          return qtd > 0 ? [...sem, { bebida, qtd }] : sem;
        }),
      definirExtra: (extra, qtd) =>
        setExtras((atual) => {
          const sem = atual.filter((e) => e.id !== extra.id);
          return qtd > 0 ? [...sem, { ...extra, qtd }] : sem;
        }),
      definirDados: (mudanca) => setDados((atual) => ({ ...atual, ...mudanca })),
      limpar: () => {
        setTamanho(null);
        setSabor(null);
        setBorda(null);
        setBebidas([]);
        setExtras([]);
        setDados(DADOS_VAZIOS);
        setContatoToken(null);
        setDistancia(null);
        setMontada(null);
      },
    }),
    [modo, tamanho, sabor, borda, bebidas, extras, dados, contatoToken, distancia, montada]
  );

  return <CheckoutContext.Provider value={valor}>{children}</CheckoutContext.Provider>;
};

export const useCheckout = (): CheckoutValor => {
  const contexto = useContext(CheckoutContext);
  if (!contexto) throw new Error('useCheckout precisa estar dentro de CheckoutProvider');
  return contexto;
};

export interface TotaisPedido {
  pizza: number;
  borda: number;
  bebidas: number;
  extras: number;
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
}

const faixaAplicada = (subtotal: number, faixas: FaixaDesconto[]): FaixaDesconto | null =>
  [...faixas].filter((f) => subtotal >= f.minimo).sort((a, b) => b.minimo - a.minimo)[0] ?? null;

export const calcularTotais = (
  estado: Pick<CheckoutValor, 'modo' | 'tamanho' | 'sabor' | 'borda' | 'bebidas' | 'extras'>,
  config: LojaConfig | undefined,
  precoPizza?: number,
  precoBase?: number,
  // no estúdio o frete só entra quando o endereço já foi informado
  opcoes?: { comTaxa?: boolean }
): TotaisPedido => {
  const doSabor = estado.sabor && estado.tamanho ? estado.sabor.precos[estado.tamanho.id] ?? 0 : 0;
  const pizza = precoPizza ?? (doSabor || precoBase || 0);
  const borda = estado.borda?.preco ?? 0;
  const bebidas = estado.bebidas.reduce((soma, b) => soma + b.bebida.preco * b.qtd, 0);
  // ingrediente que já faz parte do sabor pronto não entra de novo na conta
  const itensDoSabor = new Set(estado.sabor?.itens ?? []);
  const adicionais = estado.extras.reduce((soma, e) => soma + (itensDoSabor.has(e.id) ? 0 : e.preco * e.qtd), 0);
  const subtotal = pizza + borda + bebidas + adicionais;
  const vazio = subtotal === 0;
  const cobraTaxa = opcoes?.comTaxa !== false;
  // a loja anuncia frete grátis acima de um valor: cobrar mesmo assim é cobrar a mais
  const gratis = (config?.freteGratisAcima ?? 0) > 0 && subtotal >= (config?.freteGratisAcima ?? 0);
  const taxa = !vazio && estado.modo === 'entrega' && cobraTaxa && !gratis ? config?.taxaBase ?? 0 : 0;
  const faixa = faixaAplicada(subtotal, config?.faixas ?? []);
  const desconto = faixa ? Math.round((subtotal * faixa.percentual) / 100) : 0;
  return { pizza, borda, bebidas, extras: adicionais, subtotal, taxa, desconto, total: Math.max(0, subtotal + taxa - desconto) };
};
