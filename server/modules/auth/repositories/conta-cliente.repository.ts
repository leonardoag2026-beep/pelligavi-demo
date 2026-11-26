import { query, um } from '../../../config/db.js';

export interface ClienteConta {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  senhaHash: string | null;
}

const COLUNAS = `id_cliente AS id, nome, email, telefone, senha_hash AS "senhaHash"`;

export const contaClienteRepository = {
  porEmail: (email: string) =>
    um<ClienteConta>(
      `SELECT ${COLUNAS}
         FROM cliente
        WHERE lower(email) = lower($1) AND anonimizado = false`,
      [email],
    ),

  // o cliente entra com e-mail OU celular: o destino vem normalizado do otp.service
  porDestino: (destino: string, canal: 'email' | 'sms') =>
    um<ClienteConta>(
      canal === 'email'
        ? `SELECT ${COLUNAS} FROM cliente WHERE lower(email) = lower($1) AND anonimizado = false`
        : `SELECT ${COLUNAS}
             FROM cliente
            WHERE regexp_replace(coalesce(telefone, ''), '\D', '', 'g') = $1
              AND anonimizado = false`,
      [destino],
    ),

  porId: (id: number) =>
    um<ClienteConta>(
      `SELECT ${COLUNAS} FROM cliente WHERE id_cliente = $1 AND anonimizado = false`,
      [id],
    ),

  criarPorDestino: async (dados: { nome: string; destino: string; canal: 'email' | 'sms' }): Promise<ClienteConta> => {
    const linhas = await query<ClienteConta>(
      `INSERT INTO cliente (nome, email, telefone, email_verificado, telefone_verificado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUNAS}`,
      [
        dados.nome,
        dados.canal === 'email' ? dados.destino : null,
        dados.canal === 'sms' ? dados.destino : null,
        dados.canal === 'email',
        dados.canal === 'sms',
      ],
    );
    return linhas[0]!;
  },

  marcarVerificado: (id: number, canal: 'email' | 'sms') =>
    query(
      canal === 'email'
        ? 'UPDATE cliente SET email_verificado = true WHERE id_cliente = $1'
        : 'UPDATE cliente SET telefone_verificado = true WHERE id_cliente = $1',
      [id],
    ),

  criar: async (dados: { nome: string; email: string; telefone: string | null; senhaHash: string }) => {
    const linhas = await query<{ id: number }>(
      `INSERT INTO cliente (nome, email, telefone, senha_hash)
       VALUES ($1, lower($2), $3, $4)
       RETURNING id_cliente AS id`,
      [dados.nome, dados.email, dados.telefone, dados.senhaHash],
    );
    return linhas[0]!.id;
  },
};

export default contaClienteRepository;
