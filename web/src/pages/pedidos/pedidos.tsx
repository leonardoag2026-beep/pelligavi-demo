import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { tokenDispositivo } from '../../shared/utils/dispositivo';
import { instalarCrm } from '../../shared/styles/crm';
import { brl } from '../../shared/utils/format';

interface PedidoDispositivo {
  numero: string;
  status: string;
  total: number;
  criadoEm: string;
}

const Pedidos: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoDispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    instalarCrm();
    let vivo = true;
    void (async () => {
      try {
        const { data } = await api.get<{ pedidos: PedidoDispositivo[] }>(`/api/pedidos/dispositivo/${tokenDispositivo()}`);
        if (vivo) setPedidos(data.pedidos ?? []);
      } catch {
        if (vivo) setPedidos([]);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <main className="etapa" style={{ padding: 'clamp(1rem, 4vw, 2rem)', minHeight: '60vh' }}>
      <header className="etapa__cabecalho">
        <span className="etapa__indice">meus pedidos</span>
        <h2 className="etapa__titulo">Os pedidos deste aparelho</h2>
        <p className="etapa__apoio">Salvos pelo token do dispositivo — vale mesmo sem ter criado conta.</p>
      </header>

      <section className="pedidos-dispositivo">
        {carregando && <p className="nota">Carregando…</p>}
        {!carregando && pedidos.length === 0 && (
          <p className="nota">
            Nenhum pedido neste aparelho ainda. <Link to="/montar" className="link-discreto">Montar uma pizza</Link>.
          </p>
        )}
        {pedidos.length > 0 && (
          <ul className="pedidos-dispositivo__lista">
            {pedidos.map((p) => (
              <li key={p.numero} className="pedidos-dispositivo__item">
                <div className="pedidos-dispositivo__topo">
                  <strong>{p.numero}</strong>
                  <span className="pedidos-dispositivo__status">{p.status}</span>
                </div>
                <div className="pedidos-dispositivo__rodape">
                  <span className="nota">{new Date(p.criadoEm).toLocaleString('pt-BR')}</span>
                  <strong>{brl(p.total)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Pedidos;
