import { NaoEncontradoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import contaRepository, { type ContaLinha } from '../repositories/conta.repository.js';
import compraRepository, { type CompraLinha } from '../repositories/compra.repository.js';

export interface Conta extends ContaLinha {}

export interface Compra extends CompraLinha {
  variacao: number;
}

export interface ResumoCustos {
  mensal: number;
  imediato: number;
  contas: number;
  compras: number;
  compras30d: number;
}

export interface CompraCriada {
  compra: Compra;
  variacao: number;
  custoAnterior: number;
  custoNovo: number;
}

const variacaoDe = (pago: number, cadastrado: number): number =>
  cadastrado > 0 ? Number(((pago - cadastrado) / cadastrado).toFixed(4)) : 0;

export const custoService = {
  listarContas: async (): Promise<Conta[]> => contaRepository.listar(),

  criarConta: async (dados: {
    nome: string;
    categoria: string;
    valor: number;
    tipo: 'mensal' | 'imediato' | 'periodico';
    intervaloDias: number | null;
    diaVencimento?: number | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    repeticoes?: number | null;
    icone: string;
  }): Promise<Conta> => {
    if (dados.tipo === 'periodico' && !dados.intervaloDias) {
      throw new ValidacaoError('Conta periódica precisa do intervalo em dias');
    }
    if (dados.dataFim && dados.repeticoes) {
      throw new ValidacaoError('Escolha terminar por data OU por número de vezes');
    }
    const criada = await contaRepository.criar({
      ...dados,
      diaVencimento: dados.diaVencimento ?? null,
      dataInicio: dados.dataInicio ?? null,
      dataFim: dados.dataFim ?? null,
      repeticoes: dados.repeticoes ?? null,
    });
    if (!criada) throw new ValidacaoError('Não foi possível criar a conta');
    const conta = await contaRepository.porId(criada.id);
    if (!conta) throw new NaoEncontradoError('Conta criada não encontrada');
    return conta;
  },

  atualizarConta: async (
    id: number,
    dados: {
      nome: string;
      categoria: string;
      valor: number;
      tipo: 'mensal' | 'imediato' | 'periodico';
      intervaloDias: number | null;
      diaVencimento?: number | null;
      dataInicio?: string | null;
      dataFim?: string | null;
      repeticoes?: number | null;
    },
  ): Promise<Conta> => {
    if (dados.tipo === 'periodico' && !dados.intervaloDias) {
      throw new ValidacaoError('Conta periódica precisa do intervalo em dias');
    }
    if (dados.dataFim && dados.repeticoes) {
      throw new ValidacaoError('Escolha terminar por data OU por número de vezes');
    }
    const alteradas = await contaRepository.atualizar(id, {
      ...dados,
      diaVencimento: dados.diaVencimento ?? null,
      dataInicio: dados.dataInicio ?? null,
      dataFim: dados.dataFim ?? null,
      repeticoes: dados.repeticoes ?? null,
    });
    if (!alteradas) throw new NaoEncontradoError(`Conta ${id} não encontrada`);
    const conta = await contaRepository.porId(id);
    if (!conta) throw new NaoEncontradoError(`Conta ${id} não encontrada`);
    return conta;
  },

  removerConta: async (id: number): Promise<void> => {
    const removidas = await contaRepository.desativar(id);
    if (!removidas) throw new NaoEncontradoError(`Conta ${id} não encontrada`);
  },

  listarCompras: async (limite = 30): Promise<Compra[]> => {
    const linhas = await compraRepository.listar(limite);
    return linhas.map((l) => ({ ...l, variacao: variacaoDe(l.custoKgPago, l.custoKgCadastrado) }));
  },

  registrarCompra: async (dados: {
    slug: string;
    gramas: number;
    valorTotal: number;
    fornecedor: string | null;
    compradaEm: string | null;
  }): Promise<CompraCriada> => {
    const ingrediente = await compraRepository.ingredienteParaCompra(dados.slug);
    if (!ingrediente) throw new NaoEncontradoError(`Ingrediente ${dados.slug} não encontrado`);

    const criada = await compraRepository.registrar({
      ingredienteId: ingrediente.id,
      gramas: dados.gramas,
      valorTotal: dados.valorTotal,
      fornecedor: dados.fornecedor,
      compradaEm: dados.compradaEm,
    });
    if (!criada) throw new ValidacaoError('Não foi possível registrar a compra');

    const linha = await compraRepository.porId(criada.id);
    if (!linha) throw new NaoEncontradoError('Compra registrada não encontrada');

    const custoAnterior = ingrediente.custo_kg;
    await compraRepository.atualizarCustoDoIngrediente(ingrediente.id, linha.custoKgPago);

    return {
      compra: { ...linha, variacao: variacaoDe(linha.custoKgPago, custoAnterior) },
      variacao: variacaoDe(linha.custoKgPago, custoAnterior),
      custoAnterior,
      custoNovo: linha.custoKgPago,
    };
  },

  resumo: async (): Promise<ResumoCustos> => {
    const [contas, compras30] = await Promise.all([contaRepository.resumo(), compraRepository.totalDoPeriodo(30)]);
    return {
      mensal: contas?.mensal ?? 0,
      imediato: contas?.imediato ?? 0,
      contas: contas?.total ?? 0,
      compras: compras30?.compras ?? 0,
      compras30d: compras30?.total ?? 0,
    };
  },
};

export default custoService;
