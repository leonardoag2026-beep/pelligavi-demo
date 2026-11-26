import type { Request, Response } from 'express';
import { contaService } from '../services/auth.service.js';
import { registroSchema } from '../schemas/auth.schemas.js';
import { loginSchema } from '../schemas/auth.schemas.js';
import { COOKIE_CLIENTE } from '../../../shared/middlewares/cliente.middleware.js';

const TRINTA_DIAS = 30 * 24 * 3600 * 1000;

const contaController = {
  registrar: async (req: Request, res: Response) => {
    const { body } = registroSchema.parse({ body: req.body });
    const sessao = await contaService.registrar(body);
    res.cookie(COOKIE_CLIENTE, sessao.token, { httpOnly: true, sameSite: 'lax', maxAge: TRINTA_DIAS, path: '/' });
    return res.status(201).json(sessao);
  },

  login: async (req: Request, res: Response) => {
    const { body } = loginSchema.parse({ body: req.body });
    const sessao = await contaService.login(body.email, body.senha);
    res.cookie(COOKIE_CLIENTE, sessao.token, { httpOnly: true, sameSite: 'lax', maxAge: TRINTA_DIAS, path: '/' });
    return res.json(sessao);
  },

  sessao: async (req: Request, res: Response) => {
    const { cliente } = await contaService.sessao(req.cliente!.id);
    return res.json({ cliente });
  },

  sair: async (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_CLIENTE, { path: '/' });
    return res.json({ ok: true });
  },
};

export default contaController;
