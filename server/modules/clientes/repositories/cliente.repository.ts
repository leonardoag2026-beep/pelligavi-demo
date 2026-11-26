import { query, transacao, um } from '../../../config/db.js';

export interface ClienteLinha {
  id: number;
  nome: string;
  telefone: string | null;
  enderecos: string[];
  criadoEm: string;
  anonimizado: boolean;
}

const SELECT_CLIENTE = `
  SELECT c.id_cliente                                        AS id,
         c.nome,
         c.telefone,
         to_char(c.data_cadastro, 'YYYY-MM-DD"T"HH24:MI:SS')  AS "criadoEm",
         c.anonimizado,
         COALESCE((
           SELECT json_agg(e.descricao ORDER BY e.ordem)
             FROM cliente_endereco_texto e WHERE e.id_cliente = c.id_cliente
         ), '[]'::json)                                      AS enderecos
    FROM cliente c
`;

export const clienteRepository = {
  listar: (busca?: string) =>
    query<ClienteLinha>(
      `${SELECT_CLIENTE}
        WHERE ($1::text IS NULL OR c.nome ILIKE '%' || $1 || '%'
               OR regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') LIKE '%' || regexp_replace($1, '\\D', '', 'g') || '%')
        ORDER BY c.nome`,
      [busca?.trim() || null],
    ),

  porId: (id: number) => um<ClienteLinha>(`${SELECT_CLIENTE} WHERE c.id_cliente = $1`, [id]),

  porTelefone: (telefone: string) =>
    um<ClienteLinha>(
      `${SELECT_CLIENTE}
        WHERE regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')`,
      [telefone],
    ),

  criar: async (dados: { nome: string; telefone: string | null; enderecos: string[] }): Promise<number> =>
    transacao(async (cliente) => {
      const { rows } = await cliente.query<{ id: number }>(
        `INSERT INTO cliente (nome, telefone) VALUES ($1, $2) RETURNING id_cliente AS id`,
        [dados.nome, dados.telefone],
      );
      const id = rows[0]!.id;
      await clienteRepository.gravarEnderecos(cliente as any, id, dados.enderecos);
      return id;
    }),

  atualizar: async (id: number, dados: { nome: string; telefone: string | null; enderecos: string[] }): Promise<void> => {
    await transacao(async (cliente) => {
      await cliente.query(`UPDATE cliente SET nome = $2, telefone = $3 WHERE id_cliente = $1`, [
        id,
        dados.nome,
        dados.telefone,
      ]);
      await cliente.query(`DELETE FROM cliente_endereco_texto WHERE id_cliente = $1`, [id]);
      await clienteRepository.gravarEnderecos(cliente as any, id, dados.enderecos);
    });
  },

  gravarEnderecos: async (cliente: { query: (sql: string, params?: unknown[]) => Promise<unknown> }, id: number, enderecos: string[]): Promise<void> => {
    let ordem = 0;
    for (const descricao of enderecos) {
      const texto = descricao.trim();
      if (!texto) continue;
      await cliente.query(
        `INSERT INTO cliente_endereco_texto (id_cliente, ordem, descricao) VALUES ($1, $2, $3)`,
        [id, ordem, texto],
      );
      ordem += 1;
    }
  },

  anonimizar: async (id: number, rotulo: string): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE cliente
          SET nome = $2, telefone = NULL, anonimizado = TRUE, anonimizado_em = NOW()
        WHERE id_cliente = $1
        RETURNING id_cliente AS id`,
      [id, rotulo],
    );
    if (linhas.length) {
      await query(`DELETE FROM cliente_endereco_texto WHERE id_cliente = $1`, [id]);
    }
    return linhas.length;
  },

  total: () => um<{ total: number }>(`SELECT COUNT(*)::int AS total FROM cliente`),
};

export default clienteRepository;
