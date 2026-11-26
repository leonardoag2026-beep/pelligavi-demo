import { Router } from 'express';
import cardapioController from '../controllers/cardapio.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/cardapio:
 *   get:
 *     summary: Cardápio completo (tamanhos, sabores, bebidas e bordas)
 *     tags: [Cardápio]
 *     responses:
 *       200:
 *         description: Tamanhos, sabores com preço por tamanho, bebidas e bordas
 */
const cardapioRoutes = Router();

cardapioRoutes.get('/', cardapioController.listar);
cardapioRoutes.get('/produtos/:slug', cardapioController.produto);
cardapioRoutes.get('/sabores/:slug', cardapioController.sabor);
cardapioRoutes.put('/sabores/:slug', autenticar, cardapioController.salvarSabor);
cardapioRoutes.post('/sabores', autenticar, cardapioController.criarSabor);
cardapioRoutes.delete('/sabores/:slug', autenticar, cardapioController.removerSabor);
cardapioRoutes.patch('/produtos/:slug/preco', autenticar, cardapioController.atualizarPreco);
cardapioRoutes.patch('/produtos/:slug/ativo', autenticar, cardapioController.definirAtivo);
cardapioRoutes.patch('/tamanhos/:slug', autenticar, cardapioController.atualizarTamanho);
cardapioRoutes.post('/bebidas', autenticar, cardapioController.criarBebida);
cardapioRoutes.put('/bebidas/:slug', autenticar, cardapioController.salvarBebida);
cardapioRoutes.delete('/bebidas/:slug', autenticar, cardapioController.removerBebida);
cardapioRoutes.post('/bebidas/:slug/imagem', autenticar, cardapioController.enviarImagemBebida);
cardapioRoutes.post('/tamanhos', autenticar, cardapioController.criarTamanho);
cardapioRoutes.delete('/tamanhos/:slug', autenticar, cardapioController.removerTamanho);

export default cardapioRoutes;
