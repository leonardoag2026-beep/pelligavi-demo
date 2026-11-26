import { Router } from 'express';
import cardapioRoutes from '../../modules/cardapio/index.js';
import { geoRoutes } from '../../modules/geo/index.js';
import ingredienteRoutes from '../../modules/ingredientes/index.js';
import conversaRoutes from '../../modules/crm/index.js';
import custoRoutes from '../../modules/custos/index.js';
import pedidoRoutes from '../../modules/pedidos/index.js';
import clienteRoutes from '../../modules/clientes/index.js';
import caixaRoutes from '../../modules/caixa/index.js';
import relatorioRoutes from '../../modules/relatorios/index.js';
import configRoutes from '../../modules/config/index.js';
import pagamentoRoutes from '../../modules/pagamentos/index.js';
import notificacaoRoutes from '../../modules/notificacoes/index.js';
import funcionarioRoutes from '../../modules/funcionarios/index.js';
import authRoutes from '../../modules/auth/index.js';
import { query } from '../../config/db.js';

/**
 * @openapi
 * /api/saude:
 *   get:
 *     summary: Estado da API e do banco
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: ok
 */
const apiRoutes = Router();

apiRoutes.get('/saude', async (_req, res) => {
  const banco = await query<{ agora: string }>('SELECT NOW()::text AS agora');
  return res.json({ ok: true, banco: banco[0]?.agora ?? null });
});

apiRoutes.use('/geo', geoRoutes);
apiRoutes.use('/cardapio', cardapioRoutes);
apiRoutes.use('/ingredientes', ingredienteRoutes);
apiRoutes.use('/crm/conversas', conversaRoutes);
apiRoutes.use('/custos', custoRoutes);
apiRoutes.use('/pedidos', pedidoRoutes);
apiRoutes.use('/clientes', clienteRoutes);
apiRoutes.use('/caixa', caixaRoutes);
apiRoutes.use('/relatorios', relatorioRoutes);
apiRoutes.use('/config', configRoutes);
apiRoutes.use('/pagamentos', pagamentoRoutes);
apiRoutes.use('/notificacoes', notificacaoRoutes);
apiRoutes.use('/funcionarios', funcionarioRoutes);
apiRoutes.use('/auth', authRoutes);

export default apiRoutes;
