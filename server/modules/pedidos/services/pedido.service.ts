import { NaoEncontradoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import { um } from '../../../config/db.js';
import pedidoRepository, { type PedidoLinha } from '../repositories/pedido.repository.js';
import precoPedidoService, { type ItemEntrada, type ItemResolvido } from './preco-pedido.service.js';

// pedido nascido de uma cobrança (PIX) usa os mesmos itens que geraram o valor
const cobrancaItens = async (codigo: string): Promise<ItemEntrada[]> => {
  const linha = await um<{ entrada: ItemEntrada[] | null }>(`SELECT entrada FROM cobranca WHERE codigo = $1`, [codigo]);
  if (!linha) throw new NaoEncontradoError(`Cobrança ${codigo} não encontrada`);
  if (!Array.isArray(linha.entrada) || !linha.entrada.length) {
    throw new ValidacaoError('Cobrança sem itens de origem');
  }
  return linha.entrada;
};

export interface PedidoApi {
  id: string;
  numero: number;
  canal: string;
  cliente: { nome: string; telefone: string | null };
  endereco: string | null;
  itens: { nome: string; detalhe: string | null; qtd: number; preco: number; tipo: string | null; composicao?: string[] }[];
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
  status: string;
  tipo: string;
  observacao: string | null;
  pagamentos: { metodo: string; valor: number; status: string; em: number }[];
  historico: { status: string; em: number; motivo: string | null }[];
  dispositivo: string | null;
  contaRef: string | null;
  criadoEm: string;
}

const STATUS_DO_BANCO: Record<string, string> = {
  'Recebido': 'recebido',
  'Em preparo': 'preparo',
  'Pronto': 'pronto',
  'Saiu para entrega': 'rota',
  'Entregue': 'entregue',
  'Retirado': 'retirado',
  'Cancelado': 'cancelado',
};

const STATUS_PARA_BANCO: Record<string, string> = {
  recebido: 'Recebido',
  preparo: 'Em preparo',
  pronto: 'Pronto',
  rota: 'Saiu para entrega',
  entregue: 'Entregue',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
};

const CANAL_PARA_BANCO: Record<string, string> = {
  site: 'Site',
  whatsapp: 'WhatsApp',
  ifood: 'iFood',
  '99food': '99Food',
  telefone: 'Telefone',
  balcao: 'Balcao',
};

const TIPO_PARA_BANCO: Record<string, string> = {
  entrega: 'Entrega',
  retirada: 'Retirada',
  balcao: 'Balcao',
};

const FORMA_PARA_BANCO: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  credito: 'Cartao de credito',
  debito: 'Cartao de debito',
};

const montar = (linha: PedidoLinha): PedidoApi => ({
  id: `PLG-${linha.numero}`,
  numero: linha.numero,
  canal: linha.canal.toLowerCase(),
  cliente: { nome: linha.nomeCliente, telefone: linha.telefone },
  endereco: linha.endereco,
  itens: linha.itens,
  subtotal: linha.subtotal,
  taxa: linha.taxa,
  desconto: linha.desconto,
  total: linha.total,
  status: STATUS_DO_BANCO[linha.status] ?? linha.status.toLowerCase(),
  tipo: linha.tipo.toLowerCase(),
  observacao: linha.observacao,
  pagamentos: linha.pagamentos.map((p) => ({
    metodo: p.metodo,
    valor: p.valor,
    status: p.status,
    em: new Date(p.em).getTime(),
  })),
  historico: linha.historico.map((h) => ({
    status: STATUS_DO_BANCO[h.status] ?? h.status.toLowerCase(),
    em: new Date(h.em).getTime(),
    motivo: h.motivo ?? null,
  })),
  dispositivo: linha.dispositivo,
  contaRef: linha.contaRef,
  criadoEm: linha.criadoEm,
});

export const pedidoService = {
  listar: async (filtro: { dispositivo?: string; contaRef?: string; limite?: number }) => {
    const linhas = await pedidoRepository.listar(filtro);
    return linhas.map(montar);
  },

  porNumero: async (numero: number): Promise<PedidoApi> => {
    const linha = await pedidoRepository.porNumero(numero);
    if (!linha) throw new NaoEncontradoError(`Pedido ${numero} não encontrado`);
    return montar(linha);
  },

  // preço que a tela mostra: calculado aqui, sem gravar pedido
  orcamento: async (itens: ItemEntrada[], tipo: string) => {
    const { itens: resolvidos, subtotal } = await precoPedidoService.calcular(itens);
    const totais = await precoPedidoService.totais(subtotal, tipo);
    return { itens: resolvidos, ...totais };
  },

  criar: async (dados: {
    canal: string;
    tipo: string;
    nomeCliente: string;
    telefone: string | null;
    endereco: string | null;
    observacao: string | null;
    status: string;
    dispositivo: string | null;
    contaRef: string | null;
    itens: ItemEntrada[];
    cobrancaCodigo: string | null;
    metodoPagamento: string | null;
    statusPagamento: string;
  }): Promise<PedidoApi> => {
    // preço, nome e quantidade saem do banco: a entrada é só "o que o cliente quer"
    const entrada = dados.cobrancaCodigo ? await cobrancaItens(dados.cobrancaCodigo) : dados.itens;
    const { itens, subtotal } = await precoPedidoService.calcular(entrada);
    const regra = await pedidoRepository.regraDeCobranca();
    const gratis = regra.freteGratisAcima > 0 && subtotal >= regra.freteGratisAcima;
    const taxa = dados.tipo === 'entrega' && !gratis ? regra.taxaBase : 0;
    const faixa = regra.faixas.find((f) => subtotal >= f.minimo) ?? null;
    const desconto = faixa ? Math.round((subtotal * faixa.percentual) / 100) : 0;
    const total = subtotal + taxa - desconto;

    const linha = await pedidoRepository.criar({
      canal: CANAL_PARA_BANCO[dados.canal] ?? 'Site',
      tipo: TIPO_PARA_BANCO[dados.tipo] ?? 'Entrega',
      nomeCliente: dados.nomeCliente,
      telefone: dados.telefone,
      endereco: dados.endereco,
      observacao: dados.observacao,
      subtotal,
      taxa,
      desconto,
      total,
      status: STATUS_PARA_BANCO[dados.status] ?? 'Recebido',
      dispositivo: dados.dispositivo,
      contaRef: dados.contaRef,
      itens: itens.map((i: ItemResolvido) => ({ ...i })),
      formaPagamento: dados.metodoPagamento ? FORMA_PARA_BANCO[dados.metodoPagamento] ?? null : null,
      statusPagamento: dados.statusPagamento,
    });

    return montar(linha);
  },

  mudarStatus: async (numero: number, status: string, motivo: string | null): Promise<PedidoApi> => {
    const nome = STATUS_PARA_BANCO[status];
    if (!nome) throw new ValidacaoError(`Status ${status} não existe`);
    const linha = await pedidoRepository.mudarStatus(numero, nome, motivo);
    if (!linha) throw new NaoEncontradoError(`Pedido ${numero} não encontrado`);
    return montar(linha);
  },
};

export default pedidoService;
