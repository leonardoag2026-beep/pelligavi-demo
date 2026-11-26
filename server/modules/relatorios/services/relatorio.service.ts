import relatorioRepository from '../repositories/relatorio.repository.js';

export interface Relatorio {
  periodo: { de: string | null; ate: string | null };
  resumo: { pedidos: number; total: number; ticket: number; tempoMedio: number | null };
  vendasPorDia: { dia: string; total: number; pedidos: number }[];
  porFormaPagamento: { metodo: string; total: number; qtd: number }[];
  porCanal: { canal: string; total: number; pedidos: number }[];
  topItens: { nome: string; qtd: number; total: number }[];
  comprasPorDia: { dia: string; total: number }[];
}

export const relatorioService = {
  resumo: async (de: string | null, ate: string | null, limiteItens = 8): Promise<Relatorio> => {
    const [resumo, vendasPorDia, porFormaPagamento, porCanal, topItens, comprasPorDia] = await Promise.all([
      relatorioRepository.resumo(de, ate),
      relatorioRepository.vendasPorDia(de, ate),
      relatorioRepository.porFormaPagamento(de, ate),
      relatorioRepository.porCanal(de, ate),
      relatorioRepository.topItens(de, ate, limiteItens),
      relatorioRepository.comprasPorDia(de, ate),
    ]);

    return {
      periodo: { de, ate },
      resumo: {
        pedidos: resumo?.pedidos ?? 0,
        total: resumo?.total ?? 0,
        ticket: resumo?.ticket ?? 0,
        tempoMedio: resumo?.tempoMedio ?? null,
      },
      vendasPorDia,
      porFormaPagamento,
      porCanal,
      topItens,
      comprasPorDia,
    };
  },
};

export default relatorioService;
