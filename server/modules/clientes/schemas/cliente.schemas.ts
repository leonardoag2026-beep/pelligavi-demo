import { z } from 'zod';

const enderecos = z.array(z.string().trim().min(1).max(200)).max(20).default([]);

export const clienteParamSchema = z.object({
  params: z.object({ id: z.string().regex(/^c?\d+$/, 'id de cliente inválido') }),
});

export const listarClientesSchema = z.object({
  query: z.object({ busca: z.string().trim().max(100).optional() }),
});

export const novoClienteSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(1).max(100),
    telefone: z.string().trim().max(20).nullable().optional(),
    enderecos,
  }),
});

export const checkoutSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(1).max(100),
    telefone: z.string().trim().max(20).nullable().optional(),
    endereco: z.string().trim().max(200).nullable().optional(),
  }),
});

export type NovoClienteBody = z.infer<typeof novoClienteSchema>;
export type CheckoutBody = z.infer<typeof checkoutSchema>;
