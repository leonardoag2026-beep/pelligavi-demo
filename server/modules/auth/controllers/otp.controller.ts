import type { Request, Response } from 'express';
import { otpService } from '../services/otp.service.js';
import { otpEnviarSchema, otpEntrarSchema, otpRegistrarSchema } from '../schemas/otp.schemas.js';
import { COOKIE_CLIENTE } from '../../../shared/middlewares/cliente.middleware.js';

const TRINTA_DIAS = 30 * 24 * 3600 * 1000;
const cookieDeSessao = { httpOnly: true, sameSite: 'lax' as const, maxAge: TRINTA_DIAS, path: '/' };

const COOKIE_GERENTE = 'x-token';

const otpController = {
  // login do cliente
  enviar: async (req: Request, res: Response) => {
    const { body } = otpEnviarSchema.parse({ body: req.body });
    return res.json(await otpService.enviarLogin(body.destino));
  },

  entrar: async (req: Request, res: Response) => {
    const { body } = otpEntrarSchema.parse({ body: req.body });
    const resultado = await otpService.entrar(body.destino, body.codigo);
    if (resultado.precisaCadastro) return res.json(resultado);
    res.cookie(COOKIE_CLIENTE, resultado.token, cookieDeSessao);
    return res.json({ precisaCadastro: false, cliente: resultado.cliente });
  },

  registrar: async (req: Request, res: Response) => {
    const { body } = otpRegistrarSchema.parse({ body: req.body });
    const sessao = await otpService.registrar(body);
    res.cookie(COOKIE_CLIENTE, sessao.token, cookieDeSessao);
    return res.status(201).json({ cliente: sessao.cliente });
  },

  // confirmação de contato usada no checkout
  enviarContato: async (req: Request, res: Response) => {
    const { body } = otpEnviarSchema.parse({ body: req.body });
    return res.json(await otpService.enviarContato(body.destino));
  },

  confirmarContato: async (req: Request, res: Response) => {
    const { body } = otpEntrarSchema.parse({ body: req.body });
    return res.json(await otpService.confirmarContato(body.destino, body.codigo));
  },
};

export default otpController;
