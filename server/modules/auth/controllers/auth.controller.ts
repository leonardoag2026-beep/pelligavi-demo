import type { Request, Response } from 'express';
import { COOKIE_TOKEN } from '../../../shared/middlewares/auth.middleware.js';
import authService from '../services/auth.service.js';
import { loginSchema } from '../schemas/auth.schemas.js';

const DOZE_HORAS = 12 * 3600 * 1000;

const authController = {
  login: async (req: Request, res: Response) => {
    const { body } = loginSchema.parse({ body: req.body });
    const sessao = await authService.login(body.email, body.senha);
    res.cookie(COOKIE_TOKEN, sessao.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: DOZE_HORAS,
      path: '/',
    });
    return res.json(sessao);
  },

  sessao: async (req: Request, res: Response) => {
    const { gerente } = await authService.sessao(req.gerente!.id);
    return res.json({ gerente });
  },

  sair: async (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_TOKEN, { path: '/' });
    return res.json({ ok: true });
  },
};

export default authController;
