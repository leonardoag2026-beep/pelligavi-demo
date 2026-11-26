import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckout, calcularTotais } from '../../context/checkout-context';
import { useGetCardapio } from '../../../cardapio/hooks/cardapio-api.hooks';

import { useGetConfig } from '../../../config/hooks/config-api.hooks';
import { useCriarPedido, useOrcamento } from '../../../pedidos/hooks/pedidos-api.hooks';
import { useCriarCobranca, usePagarCobranca } from '../../../pagamentos/hooks/pagamentos-api.hooks';
import { clientesService } from '../../../../api/services/clientes';
import { brl } from '../../../../shared/utils/format';
import { tokenDispositivo } from '../../../../shared/utils/dispositivo';
import { enderecoDe } from '../step-dados/step-dados';
import { StepContato } from '../step-contato/step-contato';
import { useSessaoCliente } from '../../hooks/sessao-cliente.hook';
import type { ItemPedidoEntrada } from '../../../../api/services/pedidos';
import { QrPix } from '../../../../shared/ui/qr-pix/qr-pix';

const METODOS = [
  { id: 'pix', rotulo: 'PIX' },
  { id: 'credito', rotulo: 'Crédito' },
  { id: 'debito', rotulo: 'Débito' },
  { id: 'dinheiro', rotulo: 'Dinheiro' },
] as const;

const codigoCurto = (): string => Math.random().toString(36).slice(2, 10);

export const StepPagamento: React.FC<{ aoConfirmar?: (numero: string) => void }> = ({ aoConfirmar }) => {
  const checkout = useCheckout();
  const { data: config } = useGetConfig();
  const navigate = useNavigate();
  const criarPedido = useCriarPedido();
  const { data: sessao } = useSessaoCliente();
  const logado = Boolean(sessao?.cliente);
  const criarCobranca = useCriarCobranca();
  const pagarCobranca = usePagarCobranca();
  const [escolhido, setEscolhido] = useState<'pix' | 'credito' | 'debito' | 'dinheiro'>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [cobranca, setCobranca] = useState<{ codigo: string; valor: number } | null>(null);

  const { data: cardapio } = useGetCardapio();
  const precoBase = Math.round((cardapio?.montagem.preco ?? 0) * (checkout.tamanho?.fator ?? 1));
  // a pizza montada (inclusive dividida em sabores) manda o preço: refazer a conta
  // aqui cobrava só a massa no caso de dois sabores
  const totais = calcularTotais(checkout, config, checkout.montada?.preco, precoBase);
  const endereco = enderecoDe(checkout);
  // o pedido vai como intenção (tamanho, sabores, borda, ingredientes, bebidas);
  // preço e nome de cada item saem do banco, nunca daqui
  const itensPedido = useMemo<ItemPedidoEntrada[]>(() => {
    const lista: ItemPedidoEntrada[] = [];
    if (checkout.montada) {
      lista.push({ tipo: 'pizza', ...checkout.montada.pedido });
    }
    checkout.bebidas.forEach((b) => {
      lista.push({ tipo: 'bebida', slug: b.bebida.id, qtd: b.qtd });
    });
    return lista;
  }, [checkout.montada, checkout.bebidas]);

  // o preço mostrado aqui é o do servidor (mesma conta que gera a cobrança e o pedido);
  // o cálculo local fica só como reserva enquanto a resposta não chega
  const { data: orcamento } = useOrcamento(itensPedido, checkout.modo);
  const exibir = orcamento ?? totais;

  const confirmar = async () => {
    setErro(null);
    if (!checkout.tamanho) {
      setErro('Escolha o tamanho da pizza antes de pagar.');
      return;
    }
    // montar do zero é caminho válido: sem sabor pronto, exige ao menos um ingrediente
    const temMontagem = Boolean(checkout.montada) || Boolean(checkout.sabor) || checkout.extras.some((e) => e.qtd > 0);
    if (!temMontagem) {
      setErro('Monte a pizza antes de pagar.');
      return;
    }
    if (!checkout.dados.nome.trim()) {
      setErro('Diga quem recebe o pedido.');
      return;
    }
    if (checkout.modo === 'entrega' && !endereco) {
      setErro('Preencha o endereço da entrega.');
      return;
    }

    try {
      const cliente = await clientesService.criarDoCheckout({
        nome: checkout.dados.nome,
        telefone: checkout.dados.telefone || null,
        endereco,
      }).catch((falha) => {
        // o pedido segue sem o cadastro, mas a falha não pode sumir no silêncio
        console.warn('[checkout] cliente não registrado', falha);
        return null;
      });

      // PIX em duas etapas: 1ª clique gera a cobrança e mostra o QR aqui mesmo;
      // 2ª clique ("Já paguei") fecha o pedido
      if (escolhido === 'pix' && !cobranca) {
        const codigo = codigoCurto();
        await criarCobranca.mutateAsync({
          codigo,
          body: {
            tipo: checkout.modo,
            metodo: 'pix',
            cliente: { nome: checkout.dados.nome, telefone: checkout.dados.telefone || null },
            endereco,
            clienteRef: cliente?.id ?? null,
            itens: itensPedido,
          },
        });
        setCobranca({ codigo, valor: exibir.total });
        return;
      }

      if (escolhido === 'pix' && cobranca) {
        // mock payment: sem PSP, o "Já paguei" liquida a cobrança no servidor.
        // se a liquidação falhar, o pedido NÃO pode nascer como pago
        await pagarCobranca.mutateAsync({ codigo: cobranca.codigo });
      }

      const pedido = await criarPedido.mutateAsync({
        canal: 'site',
        cliente: { nome: checkout.dados.nome, telefone: checkout.dados.telefone || null },
        endereco,
        itens: itensPedido,
        cobranca: escolhido === 'pix' && cobranca ? cobranca.codigo : null,
        tipo: checkout.modo,
        contaRef: cliente?.id ?? null,
        dispositivo: tokenDispositivo(),
        contatoToken: checkout.contatoToken,
        observacao: null,
        pagamento: { metodo: escolhido, status: escolhido === 'dinheiro' ? 'pendente' : 'pago' },
      });
      if (aoConfirmar) aoConfirmar(String(pedido.id));
      else setConfirmado(pedido.id);
      checkout.limpar();
    } catch {
      setErro('Não consegui registrar o pedido agora. Tente de novo.');
    }
  };

  if (confirmado) {
    return (
      <section className="etapa conclusao">
        <div className="conclusao__cabecalho">
          <span className="conclusao__selo">✓</span>
          <div>
            <span className="etapa__indice">Pedido confirmado</span>
            <h2 className="etapa__titulo">{confirmado}</h2>
            <p className="etapa__apoio">
              {checkout.modo === 'retirada'
                ? `Retirada no balcão em ${config?.prazoRetiradaMin ?? 20} a ${config?.prazoRetiradaMax ?? 30} min. A cozinha já recebeu.`
                : `Chega em ${config?.prazoEntregaMin ?? 35} a ${config?.prazoEntregaMax ?? 45} min. A cozinha já recebeu.`}
            </p>
          </div>
        </div>

        <div className="etapa__grade">
          <div className="etapa__principal">
            <section className="etapa__bloco">
              <h3 className="etapa__subtitulo">O que acontece agora</h3>
              <p className="etapa__apoio">
                O pedido entra na fila da cozinha e aparece no painel do gerente. Cada mudança de status
                dispara uma notificação.
              </p>
            </section>
          </div>

          <aside className="pedido" style={{ color: '#f2efe8' }}>
            <h3 className="pedido__titulo">Acompanhar depois</h3>
            <p className="pedido__prazo">
              Este pedido fica salvo no servidor — volte em “Pedidos” para ver o status sem precisar de conta.
            </p>
            <button type="button" className="botao botao--primario botao--largo" onClick={() => navigate('/montar')}>
              Montar outra pizza
            </button>
            <button type="button" className="botao botao--fantasma botao--largo" onClick={() => navigate('/pedidos')}>
              Ver meus pedidos
            </button>
            <button type="button" className="botao botao--fantasma botao--largo" onClick={() => navigate('/')}>
              Voltar à loja
            </button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <>
      {!logado && <StepContato />}
      <section className="pagamento" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2>Pagamento</h2>
        <span className="nota">PIX na hora, cartão ou dinheiro na entrega</span>

        <div className="metodos" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
          {METODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={['metodo', escolhido === m.id ? 'metodo--ativo' : ''].join(' ').trim()}
              onClick={() => setEscolhido(m.id)}
            >
              {m.rotulo}
            </button>
          ))}
        </div>

        <div className="campo-grupo__linha">
          <span className="nota">Total do pedido</span>
          <strong className="pix__valor">{brl(exibir.total)}</strong>
        </div>

        {erro && <span className="campo-erro">{erro}</span>}

        {escolhido === 'pix' && cobranca && (
          <div className="pix">
            <div className="pix__quadro">
              <QrPix semente={cobranca.codigo} />
              <span className="pix__nota">QR de demonstração — nada é cobrado</span>
            </div>
            <div className="pix__lado">
              <p className="pix__valor">PIX copia e cola · {brl(cobranca.valor)}</p>
              <div className="pix__codigo">
                <input className="entrada__campo entrada__campo--codigo" value={cobranca.codigo} readOnly />
                <button type="button" className="botao botao--fantasma botao--mini" onClick={() => void navigator.clipboard?.writeText(cobranca.codigo)}>
                  Copiar
                </button>
              </div>
              <button type="button" className="botao botao--primario botao--grande" onClick={confirmar} disabled={criarPedido.isPending}>
                {criarPedido.isPending ? 'Confirmando…' : 'Já paguei'}
              </button>
            </div>
          </div>
        )}

        <div className="pedido-detalhe__acoes" style={{ display: escolhido === 'pix' && cobranca ? 'none' : undefined }}>
          <button
            type="button"
            className="botao botao--primario botao--grande"
            onClick={confirmar}
            disabled={criarPedido.isPending || criarCobranca.isPending || (!logado && !checkout.contatoToken)}
          >
            {criarPedido.isPending || criarCobranca.isPending
              ? 'Enviando…'
              : escolhido === 'pix'
                ? `Gerar PIX de ${brl(exibir.total)}`
                : `Confirmar ${brl(exibir.total)}`}
          </button>
        </div>

        <p className="nota" style={{ marginTop: '0.25rem' }}>Ambiente de demonstração: nada é cobrado de verdade.</p>
      </section>
    </>
  );
};
