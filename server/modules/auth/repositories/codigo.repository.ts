import { query, um } from '../../../config/db.js';

export interface CodigoAtivo {
  id: number;
  codigo: string;
  tentativas: number;
}

export const codigoRepository = {
  criar: async (dados: { destino: string; canal: 'email' | 'sms'; codigo: string; proposito: 'login' | 'contato'; minutos: number }) => {
    // um código novo invalida os anteriores: evita pilha de códigos válidos no mesmo destino
    await query(
      `UPDATE codigo_acesso SET usado_em = now()
        WHERE destino = $1 AND proposito = $2 AND usado_em IS NULL`,
      [dados.destino, dados.proposito],
    );
    await query(
      `INSERT INTO codigo_acesso (destino, canal, codigo, proposito, expira_em)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
      [dados.destino, dados.canal, dados.codigo, dados.proposito, String(dados.minutos)],
    );
  },

  ativo: (destino: string, proposito: 'login' | 'contato') =>
    um<CodigoAtivo>(
      `SELECT id_codigo AS id, codigo, tentativas
         FROM codigo_acesso
        WHERE destino = $1 AND proposito = $2 AND usado_em IS NULL AND expira_em > now()
        ORDER BY criado_em DESC
        LIMIT 1`,
      [destino, proposito],
    ),

  marcarUsado: (id: number) => query('UPDATE codigo_acesso SET usado_em = now() WHERE id_codigo = $1', [id]),

  contarTentativa: (id: number) => query('UPDATE codigo_acesso SET tentativas = tentativas + 1 WHERE id_codigo = $1', [id]),

  limparAntigos: () => query("DELETE FROM codigo_acesso WHERE criado_em < now() - interval '1 day'"),
};

export default codigoRepository;
