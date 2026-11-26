import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetCobranca, usePagarCobranca } from '../../features/pagamentos/hooks/pagamentos-api.hooks';
import { useCriarPedido } from '../../features/pedidos/hooks/pedidos-api.hooks';
import { instalarCrm } from '../../shared/styles/crm';
import { brl } from '../../shared/utils/format';
import { tokenDispositivo } from '../../shared/utils/dispositivo';

const QR = ({ semente }: { semente: string }) => {
  const n = 21;
  const celulas: React.ReactNode[] = [];
  let h = 0;
  for (let i = 0; i < semente.length; i += 1) h = (h * 31 + semente.charCodeAt(i)) % 9973;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      h = (h * 1103515245 + 12345) % 2147483647;
      const canto = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      const dentro = canto && (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5));
      if (canto ? !dentro && (x < 7 && y < 7 ? !(x > 1 && x < 5 && y > 1 && y < 5) : true) : h % 3 === 0) {
        if (!canto || (x > 1 && x < 5 && y > 1 && y < 5) || (x > n - 6 && x < n - 2 && y > 1 && y < 5)) {
          celulas.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
        }
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="pix__tela" fill="#111" shapeRendering="crispEdges">
      {celulas}
    </svg>
  );
};

const Pix: React.FC = () => {
  const { codigo = '' } = useParams();
  const navigate = useNavigate();
  const { data: cobranca, isLoading, isError } = useGetCobranca(codigo);
  const pagar = usePagarCobranca();
  const criarPedido = useCriarPedido();
  const [numero, setNumero] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    instalarCrm();
  }, []);

  const confirmar = async () => {
    if (!cobranca) return;
    const pedido = await criarPedido.mutateAsync({
      canal: 'site',
      cliente: { nome: cobranca.cliente.nome, telefone: cobranca.cliente.telefone },
      endereco: cobranca.endereco,
      // o pedido nasce da cobrança: o servidor relê os itens que geraram o valor
      itens: [],
      cobranca: codigo,
      tipo: cobranca.tipo === 'retirada' ? 'retirada' : 'entrega',
      contaRef: cobranca.clienteRef,
      dispositivo: tokenDispositivo(),
      observacao: null,
      pagamento: { metodo: cobranca.metodo, status: 'pago' },
    });
    await pagar.mutateAsync({ codigo, pedidoRef: pedido.id });
    setNumero(pedido.id);
  };

  return (
    <main className="etapa" style={{ maxWidth: 720, margin: 'clamp(2rem, 6vh, 4rem) auto', padding: '0 1rem' }}>
      {isLoading && <p className="nota">Abrindo cobrança…</p>}
      {isError && <p className="campo-erro">Cobrança não encontrada.</p>}

      {cobranca && !numero && (
        <section className="pagamento">
          <div className="pix">
            <div className="pix__quadro">
              <QR semente={codigo} />
              <span className="pix__nota">QR de demonstração</span>
            </div>

            <div className="pix__lado">
              <span className="nota">cobrança {cobranca.id.toUpperCase()}</span>
              <p className="pix__valor">{brl(cobranca.valor)}</p>
              <span className="nota">
                {cobranca.itens.length} {cobranca.itens.length === 1 ? 'item' : 'itens'} · {cobranca.tipo}
              </span>

              <div className="pix__codigo">
                <input className="entrada__campo" readOnly value={`00020126${codigo.toUpperCase()}5204000053039865802BR`} />
                <button
                  type="button"
                  className="botao botao--fantasma botao--mini"
                  onClick={() => {
                    void navigator.clipboard?.writeText(`00020126${codigo.toUpperCase()}`);
                    setCopiado(true);
                  }}
                >
                  {copiado ? 'copiado' : 'copiar'}
                </button>
              </div>

              <button
                type="button"
                className="botao botao--primario botao--grande"
                onClick={confirmar}
                disabled={pagar.isPending || criarPedido.isPending}
              >
                {pagar.isPending || criarPedido.isPending ? 'Confirmando…' : 'Confirmar pagamento'}
              </button>

              <span className="nota">Ambiente de demonstração: nenhum valor é cobrado de verdade.</span>
            </div>
          </div>
        </section>
      )}

      {numero && (
        <section className="pagamento">
          <h2 style={{ marginTop: 0 }}>Pagamento confirmado</h2>
          <p className="nota">pedido {numero} registrado · pode fechar esta página, já está na cozinha.</p>
          <div className="pedido-detalhe__acoes">
            <button type="button" className="botao botao--fantasma" onClick={() => navigate('/')}>
              Voltar para a loja
            </button>
          </div>
        </section>
      )}
    </main>
  );
};

export default Pix;
