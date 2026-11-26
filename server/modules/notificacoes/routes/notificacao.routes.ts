import { Router } from 'express';
import notificacaoController from '../controllers/notificacao.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/notificacoes:
 *   get:
 *     summary: Lista notificações do painel
 *     tags: [Notificações]
 *     responses:
 *       200:
 *         description: Notificações com contador de não lidas
 */
const notificacaoRoutes = Router();

notificacaoRoutes.get('/', autenticar, notificacaoController.listar);
notificacaoRoutes.post('/', autenticar, notificacaoController.criar);
notificacaoRoutes.patch('/todas/lida', autenticar, notificacaoController.marcarTodas);
notificacaoRoutes.patch('/:id/lida', autenticar, notificacaoController.marcarLida);

export default notificacaoRoutes;
