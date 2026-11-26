import { Router } from 'express';
import conversaController from '../controllers/conversa.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/crm/conversas:
 *   get:
 *     summary: Conversas de atendimento com as mensagens
 *     tags: [CRM]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [aberta, em_atendimento, resolvida]
 *     responses:
 *       200:
 *         description: Lista de conversas
 */
const conversaRoutes = Router();

conversaRoutes.get('/', autenticar, conversaController.listar);
conversaRoutes.get('/resumo', autenticar, conversaController.resumo);
conversaRoutes.get('/:codigo', autenticar, conversaController.porCodigo);
conversaRoutes.post('/:codigo/mensagens', autenticar, conversaController.responder);
conversaRoutes.patch('/:codigo/lida', autenticar, conversaController.marcarLida);
conversaRoutes.patch('/:codigo/resolver', autenticar, conversaController.resolver);

export default conversaRoutes;
