import { Router } from 'express';
import custoController from '../controllers/custo.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/custos/contas:
 *   get:
 *     summary: Contas a pagar com equivalente mensal
 *     tags: [Custos]
 *     responses:
 *       200:
 *         description: Lista de contas ativas
 *   post:
 *     summary: Cria uma conta
 *     tags: [Custos]
 *     responses:
 *       201:
 *         description: Conta criada
 */
const custoRoutes = Router();

custoRoutes.get('/contas', autenticar, custoController.listarContas);
custoRoutes.post('/contas', autenticar, custoController.criarConta);
custoRoutes.put('/contas/:id', autenticar, custoController.atualizarConta);
custoRoutes.delete('/contas/:id', autenticar, custoController.removerConta);

/**
 * @openapi
 * /api/custos/compras:
 *   post:
 *     summary: Registra compra de insumo e reajusta o custo por kg do ingrediente
 *     tags: [Custos]
 *     responses:
 *       201:
 *         description: Compra registrada com a variação de custo
 */
custoRoutes.get('/compras', autenticar, custoController.listarCompras);
custoRoutes.post('/compras', autenticar, custoController.registrarCompra);

custoRoutes.get('/resumo', autenticar, custoController.resumo);

export default custoRoutes;
