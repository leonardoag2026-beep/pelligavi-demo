import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('E-mail inválido').max(160),
    senha: z.string().min(6, 'Senha de no mínimo 6 caracteres').max(72),
  }),
});

export const registroSchema = z.object({
  body: z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional().nullable(),
    senha: z.string().min(6).max(72),
  }),
});
