import { z } from 'zod';

// o cliente manda o QUE quer, nunca quanto custa: nome e preço saem do banco
const itemPizza = z.object({
  tipo: z.literal('pizza'),
  tamanho: z.string().trim().min(1).max(20),
  sabor: z.string().trim().max(50).nullable().optional(),
  sabores: z.array(z.string().trim().max(50).nullable()).max(4).optional(),
  borda: z.string().trim().max(50).nullable().optional(),
  ingredientes: z
    .array(z.object({ slug: z.string().trim().min(1).max(40), porcoes: z.coerce.number().int().min(1).max(99) }))
    .max(40)
    .optional(),
  // quantas partes a pizza tem e o que vai em cada uma: parte sem sabor pronto
  // é montada à mão e precisa entrar na composição da cozinha
  partes: z.coerce.number().int().min(1).max(4).optional(),
  partesInfo: z
    .array(
      z.object({
        sabor: z.string().trim().max(50).nullable().optional(),
        ingredientes: z
          .array(z.object({ slug: z.string().trim().min(1).max(40), porcoes: z.coerce.number().int().min(1).max(99) }))
          .max(40)
          .optional(),
      }),
    )
    .max(4)
    .optional(),
});

const itemSimples = z.object({
  tipo: z.enum(['bebida', 'extra']),
  slug: z.string().trim().min(1).max(50),
  qtd: z.coerce.number().int().positive().max(99).default(1),
});

export const itemPedidoSchema = z.discriminatedUnion('tipo', [itemPizza, itemSimples]);
const item = itemPedidoSchema;

// orçamento: mesma entrada do pedido, sem gravar nada — a tela mostra o preço do servidor
export const orcamentoSchema = z.object({
  body: z.object({
    tipo: z.enum(['entrega', 'retirada', 'balcao']).default('entrega'),
    itens: z.array(item).min(1).max(50),
  }),
});

export const novoPedidoSchema = z.object({
  body: z.object({
    canal: z.enum(['site', 'whatsapp', 'ifood', '99food', 'telefone', 'balcao']).default('site'),
    tipo: z.enum(['entrega', 'retirada', 'balcao']).default('entrega'),
    cliente: z.object({
      nome: z.string().trim().min(1).max(100),
      telefone: z.string().trim().max(25).nullable().optional(),
    }),
    endereco: z.string().trim().max(150).nullable().optional(),
    observacao: z.string().trim().max(255).nullable().optional(),
    // aceitos por compatibilidade, mas ignorados: o servidor calcula tudo
    subtotal: z.coerce.number().int().min(0).max(10000000).optional(),
    taxa: z.coerce.number().int().min(0).max(1000000).optional(),
    desconto: z.coerce.number().int().min(0).max(1000000).optional(),
    total: z.coerce.number().int().min(0).max(10000000).optional(),
    status: z.enum(['recebido', 'preparo']).default('recebido'),
    dispositivo: z.string().trim().max(60).nullable().optional(),
    contaRef: z.string().trim().max(40).nullable().optional(),
    cobranca: z.string().trim().min(3).max(20).nullable().optional(),
    contatoToken: z.string().trim().max(400).nullable().optional(),
    // pedido nascido de cobrança manda `cobranca` e pode deixar itens vazio
    itens: z.array(item).max(50).default([]),
    pagamento: z.object({
      metodo: z.enum(['pix', 'dinheiro', 'credito', 'debito']).nullable().optional(),
      status: z.string().trim().max(20).default('pago'),
    }).optional(),
  }),
});

export const pedidoParamSchema = z.object({
  params: z.object({ numero: z.coerce.number().int().positive() }),
});

export const listarPedidosSchema = z.object({
  query: z.object({
    dispositivo: z.string().trim().max(60).optional(),
    contaRef: z.string().trim().max(40).optional(),
    limite: z.coerce.number().int().min(1).max(200).default(100),
  }),
});

export const statusPedidoSchema = z.object({
  params: z.object({ numero: z.coerce.number().int().positive() }),
  body: z.object({
    status: z.enum(['recebido', 'preparo', 'pronto', 'rota', 'entregue', 'retirado', 'cancelado']),
    motivo: z.string().trim().max(255).nullable().optional(),
  }),
});

export type NovoPedidoBody = z.infer<typeof novoPedidoSchema>;
export type StatusPedidoBody = z.infer<typeof statusPedidoSchema>;
