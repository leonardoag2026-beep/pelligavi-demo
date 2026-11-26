import { Router } from 'express';
import funcionarioController from '../controllers/funcionario.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/funcionarios:
 *   get:
 *     summary: Lista a equipe da loja
 *     tags: [Funcionários]
 *     responses:
 *       200:
 *         description: Funcionários ativos e folha mensal
 *   post:
 *     summary: Cadastra funcionário
 *     tags: [Funcionários]
 *     responses:
 *       201:
 *         description: Funcionário criado
 */
const funcionarioRoutes = Router();

funcionarioRoutes.get('/', autenticar, funcionarioController.listar);
funcionarioRoutes.get('/resumo', autenticar, funcionarioController.resumo);
funcionarioRoutes.get('/:id', autenticar, funcionarioController.porId);
funcionarioRoutes.post('/', autenticar, funcionarioController.criar);
funcionarioRoutes.put('/:id', autenticar, funcionarioController.atualizar);
funcionarioRoutes.delete('/:id', autenticar, funcionarioController.remover);

export default funcionarioRoutes;
