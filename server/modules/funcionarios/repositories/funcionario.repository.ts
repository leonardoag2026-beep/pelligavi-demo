import { query, um } from '../../../config/db.js';
import { NaoEncontradoError } from '../../../shared/errors/app-error.js';

export interface FuncionarioLinha {
  id: number;
  nome: string;
  cargo: string;
  turno: string;
  salario: number;
  telefone: string | null;
  admissao: string | null;
  ativo: boolean;
  periodicidade: string;
  diaPagamento: number | null;
  dataFim: string | null;
}

// salário é por pagamento: mensal equivalente = salário * (30 / ciclo)
const CICLO = `CASE periodicidade
                 WHEN 'mensal'    THEN 30
                 WHEN 'quinzenal' THEN 15
                 WHEN 'semanal'   THEN 7
                 ELSE 1
               END`;

const SELECT = `
  SELECT id_funcionario                          AS id,
         nome, cargo, turno, salario, telefone, ativo,
         to_char(admissao, 'YYYY-MM-DD')         AS admissao,
         periodicidade,
         dia_pagamento                           AS "diaPagamento",
         to_char(data_fim, 'YYYY-MM-DD')         AS "dataFim",
         ROUND(salario * 30.0 / ${CICLO})::int   AS "mensalEquivalente"
    FROM funcionario
`;

export const funcionarioRepository = {
  listar: (incluirInativos = false) =>
    query<FuncionarioLinha>(
      `${SELECT} ${incluirInativos ? '' : 'WHERE ativo = TRUE'} ORDER BY nome`,
    ),

  porId: (id: number) => um<FuncionarioLinha>(`${SELECT} WHERE id_funcionario = $1`, [id]),

  folha: async (): Promise<number> => {
    // folha mensal: normaliza pela periodicidade e ignora contrato vencido
    const linhas = await query<{ total: number }>(
      `SELECT COALESCE(SUM(ROUND(salario * 30.0 / ${CICLO})), 0)::int AS total
         FROM funcionario
        WHERE ativo = TRUE
          AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)`,
    );
    return linhas[0]?.total ?? 0;
  },

  criar: async (dados: {
    nome: string;
    cargo: string;
    turno: string;
    salario: number;
    telefone: string | null;
    admissao: string | null;
    periodicidade?: string | null;
    diaPagamento?: number | null;
    dataFim?: string | null;
  }): Promise<FuncionarioLinha> => {
    const linha = await um<FuncionarioLinha>(
      `INSERT INTO funcionario (nome, cargo, turno, salario, telefone, admissao, periodicidade, dia_pagamento, data_fim)
       VALUES ($1, $2, $3, $4, $5, $6::date, COALESCE($7, 'mensal'), $8, $9::date)
       RETURNING id_funcionario AS id, nome, cargo, turno, salario, telefone, ativo,
                 periodicidade, dia_pagamento AS "diaPagamento",
                 to_char(data_fim, 'YYYY-MM-DD') AS "dataFim",
                 to_char(admissao, 'YYYY-MM-DD') AS admissao`,
      [
        dados.nome, dados.cargo, dados.turno, dados.salario, dados.telefone, dados.admissao,
        dados.periodicidade ?? null, dados.diaPagamento ?? null, dados.dataFim ?? null,
      ],
    );
    if (!linha) throw new NaoEncontradoError('Funcionário não criado');
    return linha;
  },

  atualizar: async (id: number, dados: Partial<{
    nome: string;
    cargo: string;
    turno: string;
    salario: number;
    telefone: string | null;
    admissao: string | null;
    ativo: boolean;
    periodicidade: string;
    diaPagamento: number | null;
    dataFim: string | null;
  }>): Promise<FuncionarioLinha> => {
    const linha = await um<FuncionarioLinha>(
      `UPDATE funcionario
          SET nome     = COALESCE($2, nome),
              cargo    = COALESCE($3, cargo),
              turno    = COALESCE($4, turno),
              salario  = COALESCE($5, salario),
              telefone = COALESCE($6, telefone),
              admissao = COALESCE($7::date, admissao),
              ativo    = COALESCE($8, ativo),
              periodicidade = COALESCE($9, periodicidade),
              dia_pagamento = $10,
              data_fim      = $11::date
        WHERE id_funcionario = $1
        RETURNING id_funcionario AS id, nome, cargo, turno, salario, telefone, ativo,
                  to_char(admissao, 'YYYY-MM-DD') AS admissao,
                  periodicidade,
                  dia_pagamento AS "diaPagamento",
                  to_char(data_fim, 'YYYY-MM-DD') AS "dataFim",
                  ROUND(salario * 30.0 / CASE periodicidade
                    WHEN 'quinzenal' THEN 15 WHEN 'semanal' THEN 7 WHEN 'diario' THEN 1 ELSE 30 END)::int
                    AS "mensalEquivalente"`,
      [
        id, dados.nome ?? null, dados.cargo ?? null, dados.turno ?? null,
        dados.salario ?? null, dados.telefone ?? null, dados.admissao ?? null,
        typeof dados.ativo === 'boolean' ? dados.ativo : null,
        dados.periodicidade ?? null, dados.diaPagamento ?? null, dados.dataFim ?? null,
      ],
    );
    if (!linha) throw new NaoEncontradoError(`Funcionário ${id} não encontrado`);
    return linha;
  },

  remover: async (id: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `DELETE FROM funcionario WHERE id_funcionario = $1 RETURNING id_funcionario AS id`,
      [id],
    );
    return linhas.length;
  },
};

export default funcionarioRepository;
