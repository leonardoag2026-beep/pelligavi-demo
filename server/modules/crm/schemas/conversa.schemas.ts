import { z } from 'zod';

const codigo = z.string().min(1).max(20);

export const listarConversasSchema = z.object({
  query: z.object({
    status: z.enum(['aberta', 'em_atendimento', 'resolvida']).optional(),
  }),
});

export const conversaParamSchema = z.object({
  params: z.object({ codigo }),
});

export const responderSchema = z.object({
  params: z.object({ codigo }),
  body: z.object({ texto: z.string().trim().min(1).max(2000) }),
});

export type ListarConversasQuery = z.infer<typeof listarConversasSchema>;
export type ResponderBody = z.infer<typeof responderSchema>;
