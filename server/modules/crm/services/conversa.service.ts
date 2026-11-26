import { NaoEncontradoError } from '../../../shared/errors/app-error.js';
import conversaRepository, { type ConversaLinha } from '../repositories/conversa.repository.js';

export interface Conversa {
  id: string;
  canal: string;
  nome: string;
  pedido: string | null;
  status: string;
  naoLidas: number;
  etapa: string | null;
  mensagens: { de: string; texto: string; em: number; tipo?: string; anexo?: string | null }[];
}

export interface ResumoConversas {
  total: number;
  abertas: number;
  naoLidas: number;
  porCanal: { canal: string; conversas: number }[];
}

const normalizar = (linha: ConversaLinha): Conversa => ({
  id: linha.id,
  canal: linha.canal,
  nome: linha.nome,
  pedido: linha.pedido,
  status: linha.status,
  naoLidas: linha.naoLidas,
  etapa: linha.etapa,
  mensagens: linha.mensagens,
});

export const conversaService = {
  listar: async (status?: string): Promise<Conversa[]> => {
    const linhas = await conversaRepository.listar(status);
    return linhas.map(normalizar);
  },

  porCodigo: async (codigo: string): Promise<Conversa> => {
    const linha = await conversaRepository.porCodigo(codigo);
    if (!linha) throw new NaoEncontradoError(`Conversa ${codigo} não encontrada`);
    return normalizar(linha);
  },

  resumo: async (): Promise<ResumoConversas> => {
    const linhas = await conversaRepository.listar();
    const porCanal = new Map<string, number>();
    for (const l of linhas) porCanal.set(l.canal, (porCanal.get(l.canal) ?? 0) + 1);
    return {
      total: linhas.length,
      abertas: linhas.filter((l) => l.status !== 'resolvida').length,
      naoLidas: linhas.reduce((s, l) => s + l.naoLidas, 0),
      porCanal: [...porCanal.entries()].map(([canal, conversas]) => ({ canal, conversas })),
    };
  },

  responder: async (codigo: string, texto: string): Promise<Conversa> => {
    const existente = await conversaRepository.porCodigo(codigo);
    if (!existente) throw new NaoEncontradoError(`Conversa ${codigo} não encontrada`);
    await conversaRepository.criarMensagem(codigo, 'loja', texto);
    return conversaService.porCodigo(codigo);
  },

  marcarLida: async (codigo: string): Promise<void> => {
    const alteradas = await conversaRepository.marcarLida(codigo);
    if (!alteradas) throw new NaoEncontradoError(`Conversa ${codigo} não encontrada`);
  },

  resolver: async (codigo: string): Promise<void> => {
    const alteradas = await conversaRepository.resolver(codigo);
    if (!alteradas) throw new NaoEncontradoError(`Conversa ${codigo} não encontrada`);
  },
};

export default conversaService;
