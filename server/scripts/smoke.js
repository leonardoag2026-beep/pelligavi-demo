import assert from 'node:assert/strict';
import * as dominios from '../repositories/dominios.repo.js';
import * as gerente from '../repositories/gerente.repo.js';
import * as clientes from '../repositories/cliente.repo.js';
import * as produtos from '../repositories/produto.repo.js';
import * as pedidos from '../repositories/pedido.repo.js';
import * as pagamentos from '../repositories/pagamento.repo.js';
import * as caixa from '../repositories/caixa.repo.js';
import * as relatorio from '../repositories/relatorio.repo.js';
import { pool } from '../db.js';

const ok = (nome, valor) => {
  const resumo = Array.isArray(valor) ? `${valor.length} linhas` : typeof valor === 'object' && valor ? Object.keys(valor).join(',') : String(valor);
  console.log(`  ok  ${nome.padEnd(34)} ${resumo}`);
};

const inicio = new Date('2020-01-01T00:00:00Z');
const fim = new Date('2030-01-01T00:00:00Z');

try {
  console.log('dominios');
  ok('categorias', await dominios.categorias());
  ok('tamanhos', await dominios.tamanhos());
  ok('statusPedido', await dominios.statusPedido());
  ok('canais', await dominios.canais());
  ok('tiposPedido', await dominios.tiposPedido());
  ok('formasPagamento', await dominios.formasPagamento());
  ok('regrasDesconto', await dominios.regrasDesconto());

  const totais = await dominios.calcularTotais(93.8, 1);
  assert.equal(totais.taxa, 8);
  assert.equal(totais.desconto, 4.69);
  assert.equal(totais.total, 97.11);
  ok('calcularTotais(93.80, entrega)', totais);

  console.log('gerente / clientes');
  ok('gerente.porLogin', await gerente.porLogin('gerente@pelligavi.com'));
  const busca = await clientes.listar('bruno');
  assert.equal(busca.length, 1);
  ok('clientes.listar("bruno")', busca);
  ok('clientes.enderecosDe', await clientes.enderecosDe(busca[0].id_cliente));

  console.log('cardapio');
  const sabores = await produtos.listar({ categoria: 'Pizza', somenteAtivos: true });
  assert.ok(sabores.length >= 7);
  ok('produtos.listar(pizza ativos)', sabores);
  ok('produtos.preco(pepperoni, grande)', await produtos.preco(sabores.find((s) => s.nome === 'Pepperoni').id_produto, 4));

  console.log('pedidos');
  const lista = await pedidos.listar({ de: inicio, ate: fim });
  assert.equal(lista.length, 3);
  ok('pedidos.listar(periodo)', lista);
  ok('pedidos.emAberto', await pedidos.emAberto());
  const um = await pedidos.porId(lista[0].id_pedido);
  ok('pedidos.itens', await pedidos.itens(um.id_pedido));
  ok('pedidos.historico', await pedidos.historico(um.id_pedido));
  ok('pedidos.pagamentos', await pedidos.pagamentos(um.id_pedido));

  console.log('pagamento');
  ok('pagamento.porForma', await pagamentos.porForma({ de: inicio, ate: fim }));
  assert.equal(await pagamentos.pedidoQuitado(2), true);
  assert.equal(await pagamentos.pedidoQuitado(1), true);

  console.log('caixa');
  ok('caixa.aberto', await caixa.aberto());
  ok('caixa.porFormaDesde', await caixa.porFormaDesde(inicio));

  console.log('relatorios');
  ok('relatorio.vendasPorDia', await relatorio.vendasPorDia(inicio, fim));
  ok('relatorio.vendasPorCanal', await relatorio.vendasPorCanal(inicio, fim));
  ok('relatorio.itensMaisVendidos', await relatorio.itensMaisVendidos(inicio, fim));
  ok('relatorio.tempoMedioPreparo', await relatorio.tempoMedioPreparo(inicio, fim));
  ok('relatorio.resumo', await relatorio.resumo(inicio, fim));

  console.log('\ntodas as consultas passaram');
} catch (erro) {
  console.error('\nFALHOU:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
