import { ConflitoError, NaoEncontradoError } from '../../../shared/errors/app-error.js';
import cobrancaRepository, { type CobrancaLinha } from '../repositories/cobranca.repository.js';
import precoPedidoService, { type ItemEntrada } from '../../pedidos/services/preco-pedido.service.js';

export interface Cobranca extends CobrancaLinha {}

export const cobrancaService = {
  listar: async (limite = 50): Promise<Cobranca[]> => cobrancaRepository.listar(limite),

  porCodigo: async (codigo: string): Promise<Cobranca> => {
    const linha = await cobrancaRepository.porCodigo(codigo);
    if (!linha) throw new NaoEncontradoError(`Cobrança ${codigo} não encontrada`);
    return linha;
  },

  criar: async (dados: {
    codigo: string;
    tipo: string;
    metodo: string;
    nomeCliente: string;
    telefone: string | null;
    endereco: string | null;
    contaRef: string | null;
    clienteRef: string | null;
    itens: ItemEntrada[];
    avulsa?: { descricao: string; valor: number };
  }): Promise<Cobranca> => {
    // o valor cobrado é calculado do banco, nunca do corpo da requisição
    const { itens, subtotal } = dados.avulsa
      ? {
          itens: [{ nome: dados.avulsa.descricao, detalhe: 'cobrança avulsa', qtd: 1, preco: dados.avulsa.valor, tipo: 'avulso' }],
          subtotal: dados.avulsa.valor,
        }
      : await precoPedidoService.calcular(dados.itens);
    const totais = await precoPedidoService.totais(subtotal, dados.avulsa ? 'balcao' : dados.tipo);

    const criadas = await cobrancaRepository.criar({
      codigo: dados.codigo,
      valor: totais.total,
      subtotal: totais.subtotal,
      taxa: totais.taxa,
      desconto: totais.desconto,
      tipo: dados.tipo,
      metodo: dados.metodo,
      nomeCliente: dados.nomeCliente,
      telefone: dados.telefone,
      endereco: dados.endereco,
      contaRef: dados.contaRef,
      clienteRef: dados.clienteRef,
      itens,
      entrada: dados.avulsa ? [] : dados.itens,
    });
    // código repetido não pode devolver a cobrança antiga como se fosse esta
    if (!criadas) throw new ConflitoError(`Código ${dados.codigo} já está em uso`);
    return cobrancaService.porCodigo(dados.codigo);
  },

  pagar: async (codigo: string, pedidoRef: string | null, metodo: string | null): Promise<Cobranca> => {
    const existente = await cobrancaRepository.porCodigo(codigo);
    if (!existente) throw new NaoEncontradoError(`Cobrança ${codigo} não encontrada`);
    if (existente.status !== 'aguardando') throw new ConflitoError(`Cobrança ${codigo} já está ${existente.status}`);
    await cobrancaRepository.pagar(codigo, pedidoRef, metodo);
    return cobrancaService.porCodigo(codigo);
  },

  cancelar: async (codigo: string): Promise<void> => {
    const alteradas = await cobrancaRepository.cancelar(codigo);
    if (!alteradas) throw new ConflitoError(`Cobrança ${codigo} não está aguardando pagamento`);
  },
};

export default cobrancaService;
