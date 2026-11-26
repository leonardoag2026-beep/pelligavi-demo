export interface FaixaDesconto {
  minimo: number;
  percentual: number;
}

export interface Config {
  taxaBase: number;
  faixas: FaixaDesconto[];
  metaFaturamento: number;
  nome: string;
}

// a configuração vive no banco (loja_config + regra_desconto) e chega por carregarConfig()
const ATUAL: Config = {
  taxaBase: 0,
  faixas: [],
  metaFaturamento: 0,
  nome: 'Pelligavi',
};

const trocar = (novo: Partial<Config>): void => {
  ATUAL.taxaBase = Number.isFinite(novo.taxaBase) ? Number(novo.taxaBase) : 0;
  ATUAL.metaFaturamento = Number.isFinite(novo.metaFaturamento) ? Number(novo.metaFaturamento) : 0;
  ATUAL.nome = novo.nome || ATUAL.nome;
  ATUAL.faixas = Array.isArray(novo.faixas) ? novo.faixas : [];
};

export const carregarConfig = async (): Promise<void> => {
  const resposta = await fetch('/api/config', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /config: ${resposta.status}`);
  trocar((await resposta.json()) as Config);
};

export const config = (): Config => ({
  taxaBase: ATUAL.taxaBase,
  faixas: ATUAL.faixas,
  metaFaturamento: ATUAL.metaFaturamento,
  nome: ATUAL.nome,
});

export const definirConfig = async (mudanca: Partial<Config>): Promise<Config> => {
  const resposta = await fetch('/api/config', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mudanca),
  });
  if (!resposta.ok) throw new Error(`API /config: ${resposta.status}`);
  trocar((await resposta.json()) as Config);
  return config();
};

export const taxaPara = (tipo: string): number => (tipo === 'entrega' ? config().taxaBase : 0);

const faixaPara = (subtotal: number): FaixaDesconto | null => {
  const faixa = [...config().faixas]
    .filter((f) => subtotal >= f.minimo)
    .sort((a, b) => b.minimo - a.minimo)[0];
  return faixa || null;
};

export const descontoPara = (subtotal: number): number => {
  const faixa = faixaPara(subtotal);
  return faixa ? Math.round((subtotal * faixa.percentual) / 100) : 0;
};

export const faixaAplicada = (subtotal: number): FaixaDesconto | null => faixaPara(subtotal);

export interface Totais {
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
}

export const calcularTotais = (subtotal: number, tipo: string): Totais => {
  const taxa = taxaPara(tipo);
  const desconto = descontoPara(subtotal);
  return { subtotal, taxa, desconto, total: Math.max(0, subtotal + taxa - desconto) };
};
