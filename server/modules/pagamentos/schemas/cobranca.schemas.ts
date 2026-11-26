import { z } from 'zod';
import { itemPedidoSchema } from '../../pedidos/schemas/pedido.schemas.js';

export const novaCobrancaSchema = z.object({
  body: z.object({
    codigo: z.string().trim().min(3).max(20),
    // valor não vem do front: sai dos itens (ou da cobrança avulsa do balcão)
    valor: z.coerce.number().int().min(0).max(10000000).optional(),
    subtotal: z.coerce.number().int().min(0).max(10000000).optional(),
    taxa: z.coerce.number().int().min(0).max(1000000).optional(),
    desconto: z.coerce.number().int().min(0).max(1000000).optional(),
    avulsa: z
      .object({
        descricao: z.string().trim().min(1).max(120),
        valor: z.coerce.number().int().min(1).max(10000000),
      })
      .optional(),
    tipo: z.enum(['entrega', 'retirada', 'balcao']).default('entrega'),
    metodo: z.enum(['pix', 'dinheiro', 'credito', 'debito']).default('pix'),
    cliente: z.object({
      nome: z.string().trim().min(1).max(100),
      telefone: z.string().trim().max(25).nullable().optional(),
    }),
    endereco: z.string().trim().max(200).nullable().optional(),
    contaRef: z.string().trim().max(40).nullable().optional(),
    clienteRef: z.string().trim().max(20).nullable().optional(),
    itens: z.array(itemPedidoSchema).max(50).default([]),
  }),
});

export const cobrancaParamSchema = z.object({
  params: z.object({ codigo: z.string().trim().min(3).max(20) }),
});

export const pagarCobrancaSchema = z.object({
  params: z.object({ codigo: z.string().trim().min(3).max(20) }),
  body: z.object({
    pedidoRef: z.string().trim().max(20).nullable().optional(),
    metodo: z.enum(['pix', 'dinheiro', 'credito', 'debito']).nullable().optional(),
  }),
});
