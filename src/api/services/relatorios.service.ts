import { canal as canalDe } from '../../shared/config/site.js';
import type { Canal } from '../../shared/config/site.js';

export interface VendaDia { dia: string; total: number; pedidos: number }
export interface FormaTotal { metodo: string; total: number; qtd: number }
export interface CanalTotal { canal: string; total: number; pedidos: number }
export interface ItemTotal { nome: string; qtd: number; total: number }
export interface ResumoPeriodo {
  pedidos: number;
  total: number;
  ticket: number;
  tempoMedio: number | null;
}

export interface Relatorio {
  periodo: { de: string | null; ate: string | null };
  resumo: ResumoPeriodo;
  vendasPorDia: VendaDia[];
  porFormaPagamento: FormaTotal[];
  porCanal: CanalTotal[];
  topItens: ItemTotal[];
  comprasPorDia: { dia: string; total: number }[];
}

// os agregados são calculados no banco; aqui só existe a chamada HTTP e um cache curto
const CACHE = new Map<string, Relatorio>();

const dia = (em: number): string => new Date(em).toISOString().slice(0, 10);

export const periodo = (de: number, ate: number): { de: string; ate: string } => ({ de: dia(de), ate: dia(ate) });

export const relatorio = async (de: number, ate: number): Promise<Relatorio> => {
  const chave = `${dia(de)}|${dia(ate)}`;
  const guardado = CACHE.get(chave);
  if (guardado) return guardado;

  const resposta = await fetch(`/api/relatorios/resumo?de=${chave.split('|')[0]}&ate=${chave.split('|')[1]}`, {
    credentials: 'same-origin',
  });
  if (!resposta.ok) throw new Error(`API /relatorios/resumo: ${resposta.status}`);
  const dados = (await resposta.json()) as Relatorio;
  CACHE.set(chave, dados);
  return dados;
};

export const limparCache = (): void => CACHE.clear();

export const vendasPorDia = async (de: number, ate: number): Promise<VendaDia[]> => (await relatorio(de, ate)).vendasPorDia;

export const porFormaPagamento = async (de: number, ate: number): Promise<FormaTotal[]> =>
  (await relatorio(de, ate)).porFormaPagamento;

export const porCanal = async (de: number, ate: number): Promise<CanalTotal[]> => (await relatorio(de, ate)).porCanal;

export const topItens = async (de: number, ate: number): Promise<ItemTotal[]> => (await relatorio(de, ate)).topItens;

export const tempoMedioPreparo = async (de: number, ate: number): Promise<number | null> =>
  (await relatorio(de, ate)).resumo.tempoMedio;

export const resumoPeriodo = async (de: number, ate: number): Promise<ResumoPeriodo> => (await relatorio(de, ate)).resumo;

export const canais = (): Canal[] => ['site', 'whatsapp', 'ifood', '99food'].map((id) => canalDe(id));
