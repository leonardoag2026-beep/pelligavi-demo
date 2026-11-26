-- liberdade de recorrência nos custos e no pagamento de funcionário
-- custo: além de mensal/imediato/periodico, agora tem início, fim por data ou por número de vezes,
-- e dia de vencimento no mês. Sem vigência o custo nunca "parava"
ALTER TABLE custo_conta ADD COLUMN IF NOT EXISTS data_inicio DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE custo_conta ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE custo_conta ADD COLUMN IF NOT EXISTS repeticoes INTEGER;
ALTER TABLE custo_conta ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER;

ALTER TABLE custo_conta DROP CONSTRAINT IF EXISTS ck_custo_repeticoes;
ALTER TABLE custo_conta ADD CONSTRAINT ck_custo_repeticoes CHECK (repeticoes IS NULL OR repeticoes > 0);
ALTER TABLE custo_conta DROP CONSTRAINT IF EXISTS ck_custo_dia;
ALTER TABLE custo_conta ADD CONSTRAINT ck_custo_dia CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31);

-- funcionário: salário é o valor POR PAGAMENTO; a periodicidade diz de quanto em quanto tempo
ALTER TABLE funcionario ADD COLUMN IF NOT EXISTS periodicidade TEXT NOT NULL DEFAULT 'mensal';
ALTER TABLE funcionario ADD COLUMN IF NOT EXISTS dia_pagamento INTEGER;
ALTER TABLE funcionario ADD COLUMN IF NOT EXISTS data_fim DATE;

ALTER TABLE funcionario DROP CONSTRAINT IF EXISTS ck_funcionario_periodicidade;
ALTER TABLE funcionario ADD CONSTRAINT ck_funcionario_periodicidade
  CHECK (periodicidade IN ('mensal', 'quinzenal', 'semanal', 'diario'));
ALTER TABLE funcionario DROP CONSTRAINT IF EXISTS ck_funcionario_dia;
ALTER TABLE funcionario ADD CONSTRAINT ck_funcionario_dia
  CHECK (dia_pagamento IS NULL OR dia_pagamento BETWEEN 1 AND 31);
