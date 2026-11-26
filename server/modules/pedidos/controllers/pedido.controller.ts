import type { Request, Response } from 'express';
import { ValidacaoError } from '../../../shared/errors/app-error.js';
import { otpService } from '../../auth/services/otp.service.js';
import { verificar } from '../../../shared/security/jwt.js';
import { geoService } from '../../geo/services/geo.service.js';
import pedidoService from '../services/pedido.service.js';
import {
  listarPedidosSchema,
  novoPedidoSchema,
  orcamentoSchema,
  pedidoParamSchema,
  statusPedidoSchema,
} from '../schemas/pedido.schemas.js';

const pedidoController = {
  orcamento: async (req: Request, res: Response) => {
    const { body } = orcamentoSchema.parse({ body: req.body });
    return res.json(await pedidoService.orcamento(body.itens, body.tipo));
  },

  listar: async (req: Request, res: Response) => {
    const { query } = listarPedidosSchema.parse({ query: req.query });
    const pedidos = await pedidoService.listar(query);
    return res.json(pedidos);
  },

  porDispositivo: async (req: Request, res: Response) => {
    const token = String(req.params.token || '');
    if (!/^dev_[a-z0-9-]{8,}$/i.test(token)) return res.json({ pedidos: [] });
    const pedidos = await pedidoService.listar({ dispositivo: token, limite: 30 });
    return res.json({ pedidos });
  },

  porNumero: async (req: Request, res: Response) => {
    const { params } = pedidoParamSchema.parse({ params: req.params });
    const pedido = await pedidoService.porNumero(params.numero);
    return res.json(pedido);
  },

  criar: async (req: Request, res: Response) => {
    const { body } = novoPedidoSchema.parse({ body: req.body });
    // o pedido só entra com um contato confirmado por código: sem isso não há como
    // avisar o cliente nem corrigir endereço
    // contato confirmado por código OU cliente logado (a conta já prova o contato)
    const porCodigo = Boolean(otpService.contatoValido(body.contatoToken ?? null));
    const bruto = String(req.headers.cookie || '');
    const doCookie = bruto.split(';').map((p) => p.trim()).find((p) => p.startsWith('x-cliente='));
    const doHeader = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const porSessao = Boolean(verificar(doCookie ? decodeURIComponent(doCookie.slice('x-cliente='.length)) : doHeader));
    if (!porCodigo && !porSessao) {
      throw new ValidacaoError('Confirme o celular ou o e-mail antes de fechar o pedido');
    }
    // entrega fora do raio é recusada no servidor, não só na tela
    if (body.tipo === 'entrega') {
      if (!body.endereco?.trim()) throw new ValidacaoError('Endereço de entrega é obrigatório');
      const distancia = await geoService.distanciaKm(body.endereco);
      if (!distancia.dentro) {
        throw new ValidacaoError(
          `Endereço fora da área de entrega: ${distancia.distanciaKm} km de distância (limite ${distancia.raioKm} km)`,
        );
      }
    }

    const pedido = await pedidoService.criar({
      canal: body.canal,
      tipo: body.tipo,
      nomeCliente: body.cliente.nome,
      telefone: body.cliente.telefone ?? null,
      endereco: body.endereco ?? null,
      observacao: body.observacao ?? null,
      status: body.status,
      dispositivo: body.dispositivo ?? null,
      contaRef: body.contaRef ?? null,
      itens: body.itens,
      cobrancaCodigo: body.cobranca ?? null,
      metodoPagamento: body.pagamento?.metodo ?? null,
      statusPagamento: body.pagamento?.status ?? 'pago',
    });
    return res.status(201).json(pedido);
  },

  mudarStatus: async (req: Request, res: Response) => {
    const { params, body } = statusPedidoSchema.parse({ params: req.params, body: req.body });
    const pedido = await pedidoService.mudarStatus(params.numero, body.status, body.motivo ?? null);
    return res.json(pedido);
  },
};

export default pedidoController;
