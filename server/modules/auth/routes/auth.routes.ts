import { Router } from 'express';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';
import authController from '../controllers/auth.controller.js';
import contaController from '../controllers/conta.controller.js';
import otpController from '../controllers/otp.controller.js';
import { autenticarCliente } from '../../../shared/middlewares/cliente.middleware.js';

/**
 * @openapi
 * /api/auth/gerente:
 *   post:
 *     summary: Login do gerente (cookie x-token)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token e dados do gerente
 *   get:
 *     summary: Sessão atual do gerente
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Gerente autenticado
 */
const authRoutes = Router();

authRoutes.post('/gerente', authController.login);
authRoutes.get('/gerente', autenticar, authController.sessao);
authRoutes.post('/sair', authController.sair);

// login por código (e-mail ou SMS) — não há senha
authRoutes.post('/cliente/codigo', otpController.enviar);
authRoutes.post('/cliente/entrar', otpController.entrar);
authRoutes.post('/cliente/registro', otpController.registrar);
authRoutes.get('/cliente', autenticarCliente, contaController.sessao);
authRoutes.post('/cliente/sair', contaController.sair);

// confirmação de contato antes de pagar
authRoutes.post('/contato/codigo', otpController.enviarContato);
authRoutes.post('/contato/confirmar', otpController.confirmarContato);

export default authRoutes;
