import { query, um } from '../../../config/db.js';

export interface CobrancaLinha {
  id: string;
  valor: number;
  subtotal: number;
  taxa: number;
  desconto: number;
  tipo: string;
  metodo: string;
  status: string;
  cliente: { nome: string; telefone: string | null };
  endereco: string | null;
  contaRef: string | null;
  clienteRef: string | null;
  itens: { nome: string; detalhe?: string | null; qtd: number; preco: number; tipo?: string | null }[];
  pedidoRef: string | null;
  criadoEm: string;
  pagoEm: string | null;
}

const SELECT_COBRANCA = `
  SELECT codigo                                             AS id,
         valor, subtotal, taxa, desconto, tipo, metodo, status,
         json_build_object('nome', nome_cliente, 'telefone', telefone) AS cliente,
         endereco,
         conta_ref                                          AS "contaRef",
         cliente_ref                                        AS "clienteRef",
         itens,
         pedido_ref                                         AS "pedidoRef",
         to_char(criada_em, 'YYYY-MM-DD"T"HH24:MI:SS')      AS "criadoEm",
         to_char(paga_em, 'YYYY-MM-DD"T"HH24:MI:SS')        AS "pagoEm"
    FROM cobranca
`;

export const cobrancaRepository = {
  listar: (limite = 50) =>
    query<CobrancaLinha>(`${SELECT_COBRANCA} ORDER BY criada_em DESC LIMIT $1`, [limite]),

  porCodigo: (codigo: string) => um<CobrancaLinha>(`${SELECT_COBRANCA} WHERE codigo = $1`, [codigo]),

  criar: async (dados: {
    codigo: string;
    valor: number;
    subtotal: number;
    taxa: number;
    desconto: number;
    tipo: string;
    metodo: string;
    nomeCliente: string;
    telefone: string | null;
    endereco: string | null;
    contaRef: string | null;
    clienteRef: string | null;
    itens: unknown;
    entrada: unknown;
  }): Promise<number> => {
    const linhas = await query(
      `INSERT INTO cobranca (codigo, valor, subtotal, taxa, desconto, tipo, metodo,
                             nome_cliente, telefone, endereco, conta_ref, cliente_ref, itens, entrada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
       ON CONFLICT (codigo) DO NOTHING
       RETURNING codigo`,
      [
        dados.codigo, dados.valor, dados.subtotal, dados.taxa, dados.desconto, dados.tipo,
        dados.metodo, dados.nomeCliente, dados.telefone, dados.endereco, dados.contaRef,
        dados.clienteRef, JSON.stringify(dados.itens), JSON.stringify(dados.entrada),
      ],
    );
    return linhas.length;
  },

  pagar: async (codigo: string, pedidoRef: string | null, metodo: string | null): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE cobranca
          SET status = 'pago',
              paga_em = NOW(),
              pedido_ref = COALESCE($2, pedido_ref),
              metodo = COALESCE($3, metodo)
        WHERE codigo = $1 AND status = 'aguardando'
        RETURNING id_cobranca AS id`,
      [codigo, pedidoRef, metodo],
    );
    return linhas.length;
  },

  cancelar: async (codigo: string): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE cobranca SET status = 'cancelado' WHERE codigo = $1 AND status = 'aguardando'
        RETURNING id_cobranca AS id`,
      [codigo],
    );
    return linhas.length;
  },
};

export default cobrancaRepository;
