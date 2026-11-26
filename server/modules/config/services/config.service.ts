import configRepository from '../repositories/config.repository.js';

export interface Config {
  taxaBase: number;
  metaFaturamento: number;
  nome: string;
  prazoEntregaMin: number;
  prazoEntregaMax: number;
  prazoRetiradaMin: number;
  prazoRetiradaMax: number;
  freteGratisAcima: number;
  raioEntregaKm: number;
  enderecoRetirada: string;
  faixas: { minimo: number; percentual: number }[];
  textos: { chave: string; grupo: string; valor: string }[];
}

export const configService = {
  atual: async (): Promise<Config> => {
    const [linha, faixas, textos] = await Promise.all([
      configRepository.atual(),
      configRepository.faixas(),
      configRepository.textos(),
    ]);
    return {
      taxaBase: linha?.taxaBase ?? 0,
      metaFaturamento: linha?.metaFaturamento ?? 0,
      nome: linha?.nome ?? 'Pelligavi',
      prazoEntregaMin: linha?.prazoEntregaMin ?? 35,
      prazoEntregaMax: linha?.prazoEntregaMax ?? 45,
      prazoRetiradaMin: linha?.prazoRetiradaMin ?? 20,
      prazoRetiradaMax: linha?.prazoRetiradaMax ?? 30,
      freteGratisAcima: linha?.freteGratisAcima ?? 0,
      raioEntregaKm: linha?.raioEntregaKm ?? 10,
      enderecoRetirada: linha?.enderecoRetirada ?? '',
      faixas,
      textos,
    };
  },

  salvar: async (dados: Partial<Config>): Promise<Config> => {
    const atual = await configService.atual();
    const novo: Config = {
      taxaBase: dados.taxaBase ?? atual.taxaBase,
      metaFaturamento: dados.metaFaturamento ?? atual.metaFaturamento,
      nome: dados.nome ?? atual.nome,
      prazoEntregaMin: dados.prazoEntregaMin ?? atual.prazoEntregaMin,
      prazoEntregaMax: dados.prazoEntregaMax ?? atual.prazoEntregaMax,
      prazoRetiradaMin: dados.prazoRetiradaMin ?? atual.prazoRetiradaMin,
      prazoRetiradaMax: dados.prazoRetiradaMax ?? atual.prazoRetiradaMax,
      freteGratisAcima: dados.freteGratisAcima ?? atual.freteGratisAcima,
      raioEntregaKm: dados.raioEntregaKm ?? atual.raioEntregaKm,
      enderecoRetirada: dados.enderecoRetirada ?? atual.enderecoRetirada,
      faixas: (dados.faixas ?? atual.faixas)
        .map((f) => ({ minimo: Math.max(0, Math.round(f.minimo)), percentual: Math.min(100, Math.max(0, Number(f.percentual))) }))
        .sort((a, b) => a.minimo - b.minimo),
      textos: atual.textos,
    };
    await configRepository.salvar(novo);
    return configService.atual();
  },
};

export default configService;
