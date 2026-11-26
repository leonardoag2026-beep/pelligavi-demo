import { query, transacao, um } from '../../../config/db.js';

export interface ConfigLinha {
  taxaBase: number;
  metaFaturamento: number;
  nome: string;
  prazoEntregaMin: number;
  prazoEntregaMax: number;
  prazoRetiradaMin: number;
  prazoRetiradaMax: number;
  freteGratisAcima: number;
  raioEntregaKm: number;
  enderecoRetirada: string;
}

export interface FaixaLinha {
  minimo: number;
  percentual: number;
}

export const configRepository = {
  atual: () =>
    um<ConfigLinha>(
      `SELECT taxa_base              AS "taxaBase",
              meta_faturamento       AS "metaFaturamento",
              nome,
              prazo_entrega_min      AS "prazoEntregaMin",
              prazo_entrega_max      AS "prazoEntregaMax",
              prazo_retirada_min     AS "prazoRetiradaMin",
              prazo_retirada_max     AS "prazoRetiradaMax",
              frete_gratis_acima     AS "freteGratisAcima",
              raio_entrega_km::float8 AS "raioEntregaKm",
              endereco_retirada      AS "enderecoRetirada"
         FROM loja_config WHERE id_config = 1`,
    ),

  // textos institucionais (faixa de diferenciais e passos da home)
  textos: () =>
    query<{ chave: string; grupo: string; valor: string }>(
      `SELECT chave, grupo, valor FROM loja_texto ORDER BY grupo, ordem`,
    ),

  // a regra de desconto é tabela de domínio do pedido; o módulo de configuração só lê e
  // grava aqui para a tela de ajuste ter uma fonte só
  faixas: () =>
    query<FaixaLinha>(
      `SELECT ROUND(valor_minimo * 100)::int AS minimo,
              percentual::float8             AS percentual
         FROM regra_desconto
        ORDER BY valor_minimo`,
    ),

  salvar: async (dados: { taxaBase: number; metaFaturamento: number; nome: string; prazoEntregaMin: number; prazoEntregaMax: number; freteGratisAcima: number; prazoRetiradaMin: number; prazoRetiradaMax: number; raioEntregaKm: number; enderecoRetirada: string; faixas: FaixaLinha[] }): Promise<void> => {
    await transacao(async (cliente) => {
      await cliente.query(
        `UPDATE loja_config
            SET taxa_base = $1, meta_faturamento = $2, nome = $3,
                prazo_entrega_min = $4, prazo_entrega_max = $5, frete_gratis_acima = $6,
                prazo_retirada_min = $7, prazo_retirada_max = $8,
                raio_entrega_km = $9, endereco_retirada = $10,
                atualizado_em = NOW()
          WHERE id_config = 1`,
        [dados.taxaBase, dados.metaFaturamento, dados.nome, dados.prazoEntregaMin, dados.prazoEntregaMax,
         dados.freteGratisAcima, dados.prazoRetiradaMin, dados.prazoRetiradaMax, dados.raioEntregaKm, dados.enderecoRetirada],
      );

      await cliente.query(`DELETE FROM regra_desconto`);
      for (const faixa of dados.faixas) {
        await cliente.query(
          `INSERT INTO regra_desconto (valor_minimo, percentual) VALUES ($1::numeric / 100, $2)`,
          [faixa.minimo, faixa.percentual],
        );
      }
    });
  },
};

export default configRepository;
