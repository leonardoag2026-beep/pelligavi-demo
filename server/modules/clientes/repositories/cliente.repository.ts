import { query, transacao, um } from '../../../config/db.js';
import { NaoEncontradoError } from '../../../shared/errors/app-error.js';

const mensagemDoBanco = (erro: unknown): string =>
  erro instanceof Error && erro.message ? erro.message : 'Não foi possível anonimizar o cliente';

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

  // LGPD: a limpeza de dados pessoais (cliente, pedidos e endereços) é da procedure
  // anonimizar_cliente; depois marcamos a data e limpamos os endereços em texto do app
  anonimizar: async (id: number, rotulo: string): Promise<number> => {
    try {
      await query('CALL anonimizar_cliente($1)', [id]);
    } catch (erro) {
      throw new NaoEncontradoError(mensagemDoBanco(erro));
    }
    await query(
      `UPDATE cliente SET nome = $2, anonimizado_em = NOW() WHERE id_cliente = $1`,
      [id, rotulo],
    );
    await query(`DELETE FROM cliente_endereco_texto WHERE id_cliente = $1`, [id]);
    return 1;
  },

  total: () => um<{ total: number }>(`SELECT COUNT(*)::int AS total FROM cliente`),
};

export default clienteRepository;
