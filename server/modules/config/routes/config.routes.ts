import { Router } from 'express';
import configController from '../controllers/config.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/config:
 *   get:
 *     summary: Configuração da loja (taxa de entrega, meta e faixas de desconto)
 *     tags: [Configuração]
 *     responses:
 *       200:
 *         description: Configuração atual
 *   put:
 *     summary: Atualiza a configuração da loja
 *     tags: [Configuração]
 *     responses:
 *       200:
 *         description: Configuração salva
 */
const configRoutes = Router();

configRoutes.get('/', configController.atual);
configRoutes.put('/', autenticar, configController.salvar);

export default configRoutes;
