import { atual, salvar, estado as lerEstado } from '../storage.js';
import type { Estado } from '../storage.js';
import { SITE, STATUS_PEDIDO } from '../../shared/config/site.js';
import type { ItemPedido, PagamentoItem, Pedido, TipoPedido } from '../types.js';
import { atualizarStatus as atualizarStatusRemoto } from './rastreio.service.js';
import { tokenBase } from './dispositivo.service.js';
import { registrarReembolso } from './reembolsos.service.js';

const MINUTO = 60000;
const HORA = 3600000;

interface ContaDemo {
  id: string;
  nome: string;
  identificador: string;
  senha: string;
  demo: boolean;
  criadoEm?: number;
}

const DEMO_CLIENTE: ContaDemo = {
  id: 'demo-mariana',
  nome: 'Mariana Souza',
  identificador: 'mariana@email.com',
  senha: '123456',
  demo: true,
};

const pedidosDaMariana = (agora: number): any[] => [
  {
    id: 'PLG-1041',
    numero: 1041,
    canal: 'site',
    cliente: { nome: 'Mariana Souza', telefone: '(11) 98877-2310' },
    endereco: 'Rua Wisard, 410 — Vila Madalena',
    itens: [{ nome: 'Portuguesa', detalhe: 'grande · borda de catupiry', qtd: 1, preco: 8600 }],
    subtotal: 8600,
    taxa: 0,
    total: 8600,
    status: 'preparo',
    observacao: 'Sem cebola',
    pagamento: { metodo: 'pix', status: 'pago' },
    criadoEm: agora - 2 * MINUTO,
    contaId: DEMO_CLIENTE.id,
  },
  {
    id: 'PLG-1030',
    numero: 1030,
    canal: 'site',
    cliente: { nome: 'Mariana Souza', telefone: '(11) 98877-2310' },
    endereco: 'Rua Wisard, 410 — Vila Madalena',
    itens: [{ nome: 'Margherita', detalhe: 'média', qtd: 1, preco: 6615 }],
    subtotal: 6615,
    taxa: 890,
    total: 7505,
    status: 'entregue',
    pagamento: { metodo: 'cartao', status: 'pago' },
    criadoEm: agora - 30 * HORA,
    contaId: DEMO_CLIENTE.id,
  },
];

const seed = (): Estado => {
  const agora = Date.now();
  return {
    proximoNumero: 1042,
    contas: [{ ...DEMO_CLIENTE, criadoEm: agora - 40 * 24 * HORA }],
    pedidos: [
      ...pedidosDaMariana(agora),
      {
        id: 'PLG-1040',
        numero: 1040,
        canal: 'whatsapp',
        cliente: { nome: 'Bruno Tavares', telefone: '(11) 99120-4477' },
        endereco: 'Rua Girassol, 118 — Vila Madalena',
        itens: [
          { nome: 'Calabresa', detalhe: 'grande · borda de catupiry', qtd: 1, preco: 9600 },
          { nome: 'Coca-Cola lata', detalhe: '350 ml', qtd: 2, preco: 750 },
        ],
        subtotal: 11100,
        taxa: 0,
        total: 11100,
        status: 'preparo',
        pagamento: { metodo: 'pix', status: 'pago' },
        criadoEm: agora - 4 * MINUTO,
        contaId: null,
      },
      {
        id: 'PLG-1039',
        numero: 1039,
        canal: 'ifood',
        cliente: { nome: 'Diego Salles', telefone: '(11) 98311-2090' },
        endereco: 'Rua Fradique Coutinho, 902 — Pinheiros',
        itens: [
          { nome: 'Pepperoni', detalhe: 'média', qtd: 1, preco: 8370 },
          { nome: 'Margherita', detalhe: 'pequena', qtd: 1, preco: 4900 },
        ],
        subtotal: 13270,
        taxa: 0,
        total: 13270,
        status: 'preparo',
        pagamento: { metodo: 'cartao', status: 'pago' },
        criadoEm: agora - 12 * MINUTO,
        contaId: null,
      },
      {
        id: 'PLG-1038',
        numero: 1038,
        canal: 'whatsapp',
        cliente: { nome: 'Camila Prado', telefone: '(11) 97744-1120' },
        endereco: 'Rua Aspicuelta, 44 — Vila Madalena',
        itens: [
          { nome: 'Quatro Queijos', detalhe: 'grande', qtd: 1, preco: 10502 },
          { nome: 'Cerveja artesanal', detalhe: '500 ml', qtd: 2, preco: 2200 },
        ],
        subtotal: 14902,
        taxa: 0,
        total: 14902,
        status: 'rota',
        pagamento: { metodo: 'pix', status: 'pago' },
        criadoEm: agora - 38 * MINUTO,
        contaId: null,
      },
      {
        id: 'PLG-1037',
        numero: 1037,
        canal: '99food',
        cliente: { nome: 'Rafael Nunes', telefone: '(11) 96603-8811' },
        endereco: 'Rua Harmonia, 233 — Vila Madalena',
        itens: [{ nome: 'Portuguesa', detalhe: 'média', qtd: 1, preco: 7560 }],
        subtotal: 7560,
        taxa: 0,
        total: 7560,
        status: 'entregue',
        pagamento: { metodo: 'cartao', status: 'pago' },
        criadoEm: agora - 2 * HORA - 20 * MINUTO,
        contaId: null,
      },
      {
        id: 'PLG-1036',
        numero: 1036,
        canal: 'ifood',
        cliente: { nome: 'Priscila Mota', telefone: '(11) 95522-7741' },
        endereco: 'Rua Purpurina, 71 — Vila Madalena',
        itens: [
          { nome: 'Margherita', detalhe: 'grande', qtd: 1, preco: 8722 },
          { nome: 'Horta', detalhe: 'média', qtd: 1, preco: 7425 },
          { nome: 'Guaraná Antarctica', detalhe: '2 litros', qtd: 1, preco: 1200 },
        ],
        subtotal: 17347,
        taxa: 0,
        total: 17347,
        status: 'entregue',
        pagamento: { metodo: 'cartao', status: 'pago' },
        criadoEm: agora - 3 * HORA - 5 * MINUTO,
        contaId: null,
      },
      {
        id: 'PLG-1035',
        numero: 1035,
        canal: 'site',
        cliente: { nome: 'Helena Rosa', telefone: '(11) 91234-5566' },
        endereco: 'Rua Medeiros de Albuquerque, 300 — Vila Madalena',
        itens: [{ nome: 'Margherita', detalhe: 'média · borda de catupiry', qtd: 1, preco: 7215 }],
        subtotal: 7215,
        taxa: 890,
        total: 8105,
        status: 'entregue',
        pagamento: { metodo: 'pix', status: 'pago' },
        criadoEm: agora - 24 * HORA,
        contaId: null,
      },
    ],
    conversas: [],
    links: [
      {
        code: 'PLG-8K2M',
        valor: 6400,
        descricao: 'Pedido por telefone — Dona Ivone',
        status: 'pago',
        criadoEm: agora - 5 * HORA,
      },
      {
        code: 'PLG-3Q9T',
        valor: 4890,
        descricao: 'Diferença de borda — mesa 4',
        status: 'aguardando',
        criadoEm: agora - 40 * MINUTO,
      },
    ],
    reembolsos: [
      { id: 'PLG-1034', valor: 6800, motivo: 'pedido cancelado no iFood', em: agora - 26 * HORA },
    ],
    extrato: [],
  };
};

// pedidos vêm do banco em carregarPedidos(); aqui só existe a conta de demonstração
// do cliente, que é estado de sessão do navegador e não dado de pedido
export const garantirDados = (): void => {
  const estado = lerEstado();
  if (!estado) {
    salvar(() => ({ ...seed(), pedidos: [] }));
    return;
  }
  if (((estado.contas || []) as ContaDemo[]).some((c) => c.id === DEMO_CLIENTE.id)) return;
  salvar((base) => ({
    ...base,
    contas: [...((base.contas || []) as ContaDemo[]), { ...DEMO_CLIENTE, criadoEm: Date.now() }],
  }));
};

export const base = (): Estado => atual(seed());

const SEQUENCIA_ENTREGA = ['preparo', 'pronto', 'rota', 'entregue'];
const SEQUENCIA_BALCAO = ['preparo', 'pronto', 'retirado'];

const normalizar = (pedido: any): Pedido => {
  const tipo: TipoPedido = pedido.tipo || (pedido.endereco ? 'entrega' : 'retirada');
  const ordem = tipo === 'retirada' ? SEQUENCIA_BALCAO : SEQUENCIA_ENTREGA;
  const historico = Array.isArray(pedido.historico) && pedido.historico.length
    ? pedido.historico
    : (() => {
        const lista = [{ status: 'recebido', em: pedido.criadoEm }];
        const alvo = ordem.indexOf(pedido.status);
        const passo = 6 * MINUTO;
        for (let i = 0; i <= alvo; i += 1) {
          lista.push({ status: ordem[i]!, em: pedido.criadoEm + passo * (i + 1) });
        }
        if (pedido.status === 'cancelado') lista.push({ status: 'cancelado', em: pedido.criadoEm + passo * (alvo + 2) });
        if (pedido.status === 'reembolsado') lista.push({ status: 'reembolsado', em: pedido.criadoEm + passo * (alvo + 2) });
        return lista;
      })();

  const pagamentos: PagamentoItem[] = Array.isArray(pedido.pagamentos) && pedido.pagamentos.length
    ? pedido.pagamentos
    : pedido.pagamento?.metodo && pedido.pagamento.status === 'pago'
      ? [{ metodo: pedido.pagamento.metodo, valor: pedido.total, em: pedido.criadoEm }]
      : [];

  return {
    ...pedido,
    tipo,
    desconto: pedido.desconto || 0,
    historico,
    pagamentos,
    pago: pagamentos.reduce((s, p) => s + p.valor, 0) >= pedido.total,
  } as Pedido;
};

// pedidos vivem no banco (pedido/item_pedido/pagamento/historico_status); o front
// carrega a lista no boot e usa o estado local só como cache de leitura
const doServidor = (bruto: any): Pedido => normalizar({
  id: bruto.id,
  numero: bruto.numero,
  canal: bruto.canal,
  cliente: bruto.cliente,
  endereco: bruto.endereco,
  itens: bruto.itens.map((i: any) => ({ nome: i.nome, detalhe: i.detalhe || undefined, qtd: i.qtd, preco: i.preco, tipo: i.tipo || undefined })),
  subtotal: bruto.subtotal,
  taxa: bruto.taxa,
  desconto: bruto.desconto,
  total: bruto.total,
  status: bruto.status,
  tipo: bruto.tipo,
  observacao: bruto.observacao,
  pagamento: bruto.pagamentos[0] ? { metodo: bruto.pagamentos[0].metodo.toLowerCase(), status: bruto.pagamentos[0].status } : undefined,
  pagamentos: bruto.pagamentos.map((p: any) => ({ metodo: p.metodo.toLowerCase(), valor: p.valor, em: p.em })),
  historico: bruto.historico,
  contaId: bruto.contaRef,
  dispositivo: bruto.dispositivo,
  criadoEm: new Date(bruto.criadoEm).getTime(),
  pago: bruto.pagamentos.some((p: any) => p.status === 'pago'),
});

export const carregarPedidos = async (): Promise<void> => {
  const resposta = await fetch('/api/pedidos?limite=200', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /pedidos: ${resposta.status}`);
  const lista = ((await resposta.json()) as any[]).map(doServidor);
  const maior = lista.reduce((m, p) => Math.max(m, p.numero), 1040);
  salvar((estado) => ({ ...estado, pedidos: lista, proximoNumero: maior + 1 }));
};

export const listar = (): Pedido[] => {
  const { pedidos } = base();
  return ((pedidos || []) as any[]).map(normalizar).sort((a, b) => b.criadoEm - a.criadoEm);
};

export const porNumero = (numero: number): Pedido | undefined => listar().find((p) => p.numero === Number(numero));

export const porConta = (contaId: string): Pedido[] => listar().filter((p) => p.contaId && p.contaId === contaId);

export const porDispositivo = (token: string): Pedido[] =>
  listar().filter((p) => Boolean(token) && (p as any).dispositivo === token);

export const adotarDoDispositivo = (contaId: string, token: string): number => {
  if (!contaId || !token) return 0;
  const orfaos = listar().filter((p) => (p as any).dispositivo === token && !p.contaId);
  if (!orfaos.length) return 0;
  salvar((estado) => ({
    ...estado,
    pedidos: ((estado.pedidos || []) as any[]).map((p) =>
      p.dispositivo === token && !p.contaId ? { ...p, contaId } : p
    ),
  }));
  return orfaos.length;
};

export interface DadosPedido {
  canal?: string;
  cliente: { nome: string; telefone?: string | null };
  endereco?: string | null;
  itens: ItemPedido[];
  subtotal: number;
  taxa?: number;
  desconto?: number;
  total: number;
  tipo?: TipoPedido;
  clienteId?: string | null;
  observacao?: string | null;
  pagamento?: { metodo?: string; status?: string };
  pagamentos?: PagamentoItem[];
  contaId?: string | null;
  dispositivo?: string | null;
}

export const criar = async (dados: DadosPedido): Promise<Pedido> => {
  const corpo = {
    canal: dados.canal || 'site',
    tipo: dados.tipo || 'entrega',
    cliente: { nome: dados.cliente.nome, telefone: dados.cliente.telefone ?? null },
    endereco: dados.endereco ?? null,
    observacao: dados.observacao ?? null,
    subtotal: dados.subtotal,
    taxa: dados.taxa || 0,
    desconto: dados.desconto || 0,
    total: dados.total,
    status: 'preparo',
    dispositivo: dados.dispositivo || tokenBase(),
    contaRef: dados.contaId || null,
    itens: dados.itens.map((i) => ({
      nome: i.nome,
      detalhe: i.detalhe ?? null,
      qtd: i.qtd,
      preco: i.preco,
      tipo: i.tipo ?? null,
    })),
    pagamento: {
      metodo: dados.pagamento?.metodo || 'pix',
      status: dados.pagamento?.status || 'pago',
    },
  };

  const resposta = await fetch('/api/pedidos', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`API /pedidos: ${resposta.status} ${await resposta.text()}`);

  const pedido = doServidor(await resposta.json());
  salvar((estado) => ({
    ...estado,
    proximoNumero: Math.max(Number(estado.proximoNumero) || 1041, pedido.numero + 1),
    pedidos: [pedido, ...((estado.pedidos || []) as any[]).filter((p: any) => p.numero !== pedido.numero)],
  }));
  return pedido;
};

const mudar = (numero: number, fn: (p: any) => any): void => {
  salvar((estado) => ({
    ...estado,
    pedidos: ((estado.pedidos || []) as any[]).map((p) => (p.numero === Number(numero) ? fn(p) : p)),
  }));
};

// status vai para o banco: quem acompanha o pedido lê de lá
const espelharNoServidor = (numero: number, status: string, motivo?: string): void => {
  void fetch(`/api/pedidos/${numero}/status`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, motivo: motivo ?? null }),
  }).catch(() => undefined);
};

export const avancar = (numero: number): void => {
  mudar(numero, (p) => {
    const proximo = STATUS_PEDIDO[p.status]?.proximo;
    if (!proximo) return p;
    espelharNoServidor(numero, proximo);
    return { ...p, status: proximo };
  });
};

export const marcarPago = (numero: number): void => {
  salvar((estado) => ({
    ...estado,
    pedidos: ((estado.pedidos || []) as any[]).map((p) =>
      p.numero === Number(numero) ? { ...p, pagamento: { ...p.pagamento, status: 'pago' } } : p
    ),
  }));
};

export const definirStatus = (numero: number, status: string): void => {
  if (!STATUS_PEDIDO[status]) return;
  mudar(numero, (p) => {
    if (p.status === status) return p;
    espelharNoServidor(numero, status);
    const em = Date.now();
    return {
      ...p,
      status,
      atualizadoEm: em,
      historico: [...(p.historico || []), { status, em }],
    };
  });
};

export const podeCancelar = (pedido: Pedido): boolean =>
  pedido.status === 'preparo' || pedido.status === 'pronto' || pedido.status === 'novo';

export const cancelar = (numero: number, motivo: string): void => {
  const alvo = porNumero(numero);
  if (!alvo) throw new Error('Pedido não encontrado');
  if (!podeCancelar(alvo)) throw new Error('Só é possível cancelar até o status "pronto"');
  if (!motivo || !motivo.trim()) throw new Error('Informe o motivo do cancelamento');
  espelharNoServidor(numero, 'cancelado', motivo.trim());
  mudar(numero, (p) => ({
    ...p,
    status: 'cancelado',
    motivoCancelamento: motivo.trim(),
    pagamento: { ...(p.pagamento || {}), status: 'reembolsado' },
    historico: [...(p.historico || []), { status: 'cancelado', em: Date.now(), motivo: motivo.trim() }],
  }));
};

export const podeAlterarItens = (pedido: Pedido): boolean => pedido.status === 'novo';

export const alterarItens = (numero: number, itens: ItemPedido[], subtotal: number, total: number): void => {
  const alvo = porNumero(numero);
  if (!alvo) throw new Error('Pedido não encontrado');
  if (!podeAlterarItens(alvo)) throw new Error('Itens só podem ser alterados antes de entrar em preparo');
  mudar(numero, (p) => ({ ...p, itens, subtotal, total, atualizadoEm: Date.now() }));
};

export const reembolsar = (numero: number): void => {
  const alvo = porNumero(numero);
  if (!alvo || alvo.pagamento?.status === 'reembolsado') return;
  mudar(numero, (p) => ({
    ...p,
    status: 'reembolsado',
    pagamento: { ...p.pagamento, status: 'reembolsado' },
    atualizadoEm: Date.now(),
  }));
  registrarReembolso({ valor: alvo.total, motivo: 'reembolso manual no painel', pedidoRef: alvo.id });
};

export const enderecoCompleto = (pedido: Pedido): string =>
  pedido.endereco || `Retirada no balcão — ${SITE.endereco}`;

export const ordersService = {
  listar,
  porNumero,
  porConta,
  porDispositivo,
  adotarDoDispositivo,
  criar,
  avancar,
  cancelar,
  reembolsar,
  marcarPago,
  definirStatus,
  alterarItens,
  podeCancelar,
  podeAlterarItens,
};
