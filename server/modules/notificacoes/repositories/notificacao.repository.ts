import { query } from '../../../config/db.js';

export interface NotificacaoLinha {
  id: number;
  tipo: string;
  titulo: string;
  texto: string | null;
  meta: string | null;
  lida: boolean;
  grupo: string;
  criadaEm: string;
}

// a lista vem da view vw_notificacoes, que já agrupa Hoje / Ontem / Nesta semana
const SELECT_NOTIFICACAO = `
  SELECT id_notificacao                                        AS id,
         tipo, titulo, texto, meta, lida,
         grupo,
         to_char(criada_em, 'YYYY-MM-DD"T"HH24:MI:SS')          AS "criadaEm"
    FROM vw_notificacoes
`;

export const notificacaoRepository = {
  listar: (limite = 40) =>
    query<NotificacaoLinha>(`${SELECT_NOTIFICACAO} ORDER BY criada_em DESC LIMIT $1`, [limite]),

  naoLidas: async (): Promise<number> => {
    const linhas = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM notificacao WHERE lida = FALSE`,
    );
    return linhas[0]?.total ?? 0;
  },

  // quem marca é a procedure marcar_notificacao_lida, que valida a existência
  marcarLida: async (id: number) => {
    try {
      await query('CALL marcar_notificacao_lida($1)', [id]);
    } catch {
      return;
    }
  },

  marcarTodas: () => query(`UPDATE notificacao SET lida = TRUE WHERE lida = FALSE`),

  criar: (dados: { tipo: string; titulo: string; texto: string | null; meta: string | null }) =>
    query(
      `INSERT INTO notificacao (tipo, titulo, texto, meta) VALUES ($1, $2, $3, $4)`,
      [dados.tipo, dados.titulo, dados.texto, dados.meta],
    ),
};

export default notificacaoRepository;
