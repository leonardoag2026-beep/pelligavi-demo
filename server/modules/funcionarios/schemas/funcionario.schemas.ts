import { z } from 'zod';

const cargos = ['atendente', 'pizzaiolo', 'entregador', 'caixa', 'gerente'] as const;

const corpo = z.object({
  nome: z.string().trim().min(1).max(100),
  cargo: z.enum(cargos).default('atendente'),
  turno: z.string().trim().min(1).max(30).default('18:00 - 23:30'),
  // salário é o valor POR pagamento; a periodicidade diz de quanto em quanto tempo
  salario: z.coerce.number().int().min(0).max(100000000),
  periodicidade: z.enum(['mensal', 'quinzenal', 'semanal', 'diario']).default('mensal'),
  diaPagamento: z.coerce.number().int().min(1).max(31).nullable().optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  telefone: z.string().trim().max(25).nullable().optional(),
  admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const criarFuncionarioSchema = z.object({ body: corpo });

export const atualizarFuncionarioSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: corpo.partial().extend({ ativo: z.boolean().optional() }),
});

export const idFuncionarioSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});
