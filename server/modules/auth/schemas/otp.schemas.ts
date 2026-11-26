import { z } from 'zod';

const destino = z.string().trim().min(5).max(160);
const codigo = z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos');

export const otpEnviarSchema = z.object({ body: z.object({ destino }) });

export const otpEntrarSchema = z.object({ body: z.object({ destino, codigo }) });

export const otpRegistrarSchema = z.object({
  body: z.object({ nome: z.string().trim().min(2).max(100), destino, codigo }),
});
