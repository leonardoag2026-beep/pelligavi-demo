import { query, um } from '../../../config/db.js';

export interface MensagemLinha {
  de: string;
  texto: string;
  em: number;
  anexo?: string | null;
  tipo?: string;
}

export interface ConversaLinha {
  id: string;
  canal: string;
  nome: string;
  pedido: string | null;
  status: string;
  naoLidas: number;
  etapa: string | null;
  mensagens: MensagemLinha[];
}

const SELECT_CONVERSA = `
  SELECT c.codigo                                   AS id,
         c.canal,
         c.nome,
         c.pedido,
         c.status,
         c.nao_lidas                                AS "naoLidas",
         c.etapa,
         COALESCE(
           json_agg(
             json_build_object(
               'de', m.de,
               'texto', m.texto,
               'em', (EXTRACT(EPOCH FROM m.enviada_em) * 1000)::bigint,
               'tipo', m.tipo,
               'anexo', m.anexo
             ) ORDER BY m.enviada_em, m.id_mensagem
           ) FILTER (WHERE m.id_mensagem IS NOT NULL), '[]'::json
         )                                          AS mensagens
    FROM conversa c
    LEFT JOIN mensagem m ON m.id_conversa = c.id_conversa
`;

export const conversaRepository = {
  listar: (status?: string) =>
    query<ConversaLinha>(
      `${SELECT_CONVERSA}
        WHERE ($1::text IS NULL OR c.status = $1)
        GROUP BY c.id_conversa
        ORDER BY c.atualizada_em DESC, c.id_conversa DESC`,
      [status ?? null],
    ),

  porCodigo: (codigo: string) =>
    um<ConversaLinha>(
      `${SELECT_CONVERSA}
        WHERE c.codigo = $1
        GROUP BY c.id_conversa`,
      [codigo],
    ),

  criarMensagem: async (codigo: string, de: string, texto: string): Promise<void> => {
    await query(
      `INSERT INTO mensagem (id_conversa, de, texto)
       SELECT id_conversa, $2, $3 FROM conversa WHERE codigo = $1`,
      [codigo, de, texto],
    );
    await query(
      `UPDATE conversa
          SET nao_lidas = 0,
              status = CASE WHEN status = 'aberta' THEN 'em_atendimento' ELSE status END,
              atualizada_em = NOW()
        WHERE codigo = $1`,
      [codigo],
    );
  },

  marcarLida: async (codigo: string): Promise<number> => {
    const linhas = await query<{ id_conversa: number }>(
      `UPDATE conversa SET nao_lidas = 0 WHERE codigo = $1 RETURNING id_conversa`,
      [codigo],
    );
    return linhas.length;
  },

  resolver: async (codigo: string): Promise<number> => {
    const linhas = await query<{ id_conversa: number }>(
      `UPDATE conversa SET status = 'resolvida', nao_lidas = 0, atualizada_em = NOW()
        WHERE codigo = $1 RETURNING id_conversa`,
      [codigo],
    );
    return linhas.length;
  },
};

export default conversaRepository;
