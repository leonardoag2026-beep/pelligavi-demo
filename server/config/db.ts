import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'pelligavi',
  max: 10,
});

export const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
};

export const um = async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
  const linhas = await query<T>(sql, params);
  return linhas[0] ?? null;
};

export const transacao = async <T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T> => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
};

export const fecharBanco = async (): Promise<void> => {
  await pool.end();
};
