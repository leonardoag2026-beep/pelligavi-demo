import { ConflitoError, NaoEncontradoError } from '../../../shared/errors/app-error.js';
import caixaRepository, { type CaixaLinha } from '../repositories/caixa.repository.js';

export interface Fechamento {
  id: string;
  abertaEm: number | null;
  fechadaEm: number;
  valorInicial: number;
  porForma: Record<string, number>;
  total: number;
  esperado: number;
  contado: number;
  diferenca: number;
  observacao: string | null;
}

export interface EstadoCaixa {
  aberto: boolean;
  valorInicial: number;
  abertaEm: number | null;
  id: number | null;
  pedidos: number;
  porForma: Record<string, number>;
  total: number;
  esperado: number;
  fechamentos: Fechamento[];
}

const data = (iso: string | null): number | null => (iso ? new Date(iso).getTime() : null);

const fechamentoDe = (linha: CaixaLinha): Fechamento => {
  const esperado = linha.valorEsperado ?? 0;
  const contado = linha.valorContado ?? 0;
  return {
    id: `cx${linha.id}`,
    abertaEm: data(linha.abertaEm),
    fechadaEm: data(linha.fechadaEm) ?? Date.now(),
    valorInicial: linha.valorInicial,
    porForma: linha.porForma ?? {},
    total: Object.values(linha.porForma ?? {}).reduce((s, v) => s + v, 0),
    esperado,
    contado,
    diferenca: contado - esperado,
    observacao: linha.observacao,
  };
};

export const caixaService = {
  estado: async (): Promise<EstadoCaixa> => {
    const [aberto, fechamentos] = await Promise.all([
      caixaRepository.aberto(),
      caixaRepository.fechamentos(20),
    ]);

    if (!aberto) {
      return {
        aberto: false,
        valorInicial: 0,
        abertaEm: null,
        id: null,
        pedidos: 0,
        porForma: {},
        total: 0,
        esperado: 0,
        fechamentos: fechamentos.map(fechamentoDe),
      };
    }

    const movimento = await caixaRepository.movimento(aberto.abertaEm);
    const total = movimento?.total ?? 0;
    const porForma = movimento?.porForma ?? {};
    // o que se conta na gaveta é o fundo + dinheiro vivo: cartão e PIX não entram,
    // senão todo fechamento acusa falta de um valor que nunca esteve na gaveta
    const dinheiro = Object.entries(porForma).reduce((soma, [forma, valor]) => (/dinheiro/i.test(forma) ? soma + valor : soma), 0);

    return {
      aberto: true,
      valorInicial: aberto.valorInicial,
      abertaEm: data(aberto.abertaEm),
      id: aberto.id,
      pedidos: movimento?.pedidos ?? 0,
      porForma,
      total,
      esperado: aberto.valorInicial + dinheiro,
      fechamentos: fechamentos.map(fechamentoDe),
    };
  },

  abrir: async (valorInicial: number): Promise<EstadoCaixa> => {
    const aberto = await caixaRepository.aberto();
    if (aberto) throw new ConflitoError('Já existe um caixa aberto');
    await caixaRepository.abrir(Math.max(0, Math.round(valorInicial)));
    return caixaService.estado();
  },

  fechar: async (valorContado: number, observacao: string): Promise<EstadoCaixa> => {
    const aberto = await caixaRepository.aberto();
    if (!aberto) throw new NaoEncontradoError('Nenhum caixa aberto');

    const movimento = await caixaRepository.movimento(aberto.abertaEm);
    const total = movimento?.total ?? 0;
    const esperado = aberto.valorInicial + total;

    await caixaRepository.fechar(aberto.id, {
      valorEsperado: esperado,
      valorContado: Math.max(0, Math.round(valorContado)),
      porForma: movimento?.porForma ?? {},
      observacao: observacao.trim() || null,
    });

    return caixaService.estado();
  },
};

export default caixaService;
