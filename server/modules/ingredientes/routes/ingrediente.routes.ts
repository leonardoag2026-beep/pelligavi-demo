import { Router } from 'express';
import ingredienteController from '../controllers/ingrediente.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/ingredientes:
 *   get:
 *     summary: Ingredientes de montagem com preço de porção, custo por kg e margem
 *     tags: [Ingredientes]
 *     responses:
 *       200:
 *         description: Lista de ingredientes ativos
 */
const ingredienteRoutes = Router();

ingredienteRoutes.get('/', ingredienteController.listar);
ingredienteRoutes.get('/render', ingredienteController.listarRender);
ingredienteRoutes.get('/geometrias', ingredienteController.geometrias);
ingredienteRoutes.post('/', autenticar, ingredienteController.criar);
ingredienteRoutes.put('/:slug/render', autenticar, ingredienteController.salvarRender);
ingredienteRoutes.post('/:slug/modelo', autenticar, ingredienteController.enviarModelo);
ingredienteRoutes.post('/:slug/imagem', autenticar, ingredienteController.enviarImagem);
ingredienteRoutes.post('/:slug/textura', autenticar, ingredienteController.enviarTextura);
ingredienteRoutes.patch('/:slug/classe', autenticar, ingredienteController.definirClasse);
ingredienteRoutes.patch('/:slug/peso', autenticar, ingredienteController.atualizarPeso);
ingredienteRoutes.get('/:slug', ingredienteController.porSlug);
ingredienteRoutes.patch('/:slug/preco', autenticar, ingredienteController.atualizarPreco);
ingredienteRoutes.patch('/:slug/custo', autenticar, ingredienteController.atualizarCusto);
ingredienteRoutes.patch('/:slug/ativo', autenticar, ingredienteController.definirAtivo);
ingredienteRoutes.delete('/:slug', autenticar, ingredienteController.remover);

export default ingredienteRoutes;
