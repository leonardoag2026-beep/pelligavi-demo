import { NaoEncontradoError } from '../../../shared/errors/app-error.js';
import notificacaoRepository, { type NotificacaoLinha } from '../repositories/notificacao.repository.js';

export const notificacaoService = {
  listar: async (limite = 40): Promise<{ itens: NotificacaoLinha[]; naoLidas: number }> => {
    const [itens, naoLidas] = await Promise.all([
      notificacaoRepository.listar(limite),
      notificacaoRepository.naoLidas(),
    ]);
    return { itens, naoLidas };
  },

  marcarLida: async (id: number): Promise<void> => {
    if (!Number.isInteger(id) || id <= 0) throw new NaoEncontradoError(`Notificação ${id} não encontrada`);
    await notificacaoRepository.marcarLida(id);
  },

  marcarTodas: async (): Promise<void> => {
    await notificacaoRepository.marcarTodas();
  },

  criar: async (dados: { tipo: string; titulo: string; texto?: string | null; meta?: string | null }): Promise<void> => {
    await notificacaoRepository.criar({
      tipo: dados.tipo,
      titulo: dados.titulo,
      texto: dados.texto ?? null,
      meta: dados.meta ?? null,
    });
  },
};

export default notificacaoService;
