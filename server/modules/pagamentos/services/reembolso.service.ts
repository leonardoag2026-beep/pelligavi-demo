import reembolsoRepository, { type ReembolsoLinha } from '../repositories/reembolso.repository.js';

export const reembolsoService = {
  listar: (de: string | null, ate: string | null): Promise<ReembolsoLinha[]> =>
    reembolsoRepository.listar(de, ate),

  total: (de: string | null, ate: string | null) => reembolsoRepository.total(de, ate),

  criar: (dados: { valor: number; motivo?: string | null; pedidoRef?: string | null }): Promise<ReembolsoLinha> =>
    reembolsoRepository.criar({
      valor: dados.valor,
      motivo: dados.motivo?.trim() || 'reembolso manual no painel',
      pedidoRef: dados.pedidoRef ?? null,
    }),
};

export default reembolsoService;
