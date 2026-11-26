import { useNavigate } from 'react-router-dom';
import { brl } from '../../../../shared/utils/format';
import { useGetConfig } from '../../../config/hooks/config-api.hooks';

/** Passo final: número do pedido, prazo e atalhos para acompanhar. */
export const StepConclusao: React.FC<{ numero: string; total: number; retirada: boolean }> = ({ numero, total, retirada }) => {
  const navigate = useNavigate();
  const { data: config } = useGetConfig();
  return (
    <section className="etapa conclusao">
      <div className="conclusao__cabecalho">
        <span className="conclusao__selo">✓</span>
        <div>
          <span className="etapa__indice">Pedido confirmado</span>
          <h2 className="etapa__titulo">{numero}</h2>
          <p className="etapa__apoio">
            {retirada
              ? `Retirada no balcão em ${config?.prazoRetiradaMin ?? 20} a ${config?.prazoRetiradaMax ?? 30} min.`
              : `Chega em ${config?.prazoEntregaMin ?? 35} a ${config?.prazoEntregaMax ?? 45} min.`}{' '}
            A cozinha já recebeu.
          </p>
        </div>
      </div>

      <div className="pedido" style={{ color: '#f2efe8' }}>
        <h3 className="pedido__titulo">Acompanhar depois</h3>
        <p className="pedido__prazo">
          Este pedido fica salvo no servidor — volte em “Pedidos” para ver o status sem precisar de conta.
        </p>
        <div className="pedido__linha pedido__linha--total">
          <span>Total</span>
          <span>{brl(total)}</span>
        </div>
        <button type="button" className="botao botao--primario botao--largo" onClick={() => navigate('/montar')}>
          Montar outra pizza
        </button>
        <button type="button" className="botao botao--fantasma botao--largo" onClick={() => navigate('/pedidos')}>
          Ver meus pedidos
        </button>
        <button type="button" className="botao botao--fantasma botao--largo" onClick={() => navigate('/')}>
          Voltar à loja
        </button>
      </div>
    </section>
  );
};

export default StepConclusao;
