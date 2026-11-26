import { useMemo, useState } from 'react';
import { useAnonimizarCliente, useGetClientes } from '../hooks/clientes-api.hooks';
import { useGetPedidos } from '../../pedidos/hooks/pedidos-api.hooks';
import { brl, dataCurta } from '../../../shared/utils/format';

export const PainelClientes: React.FC = () => {
  const { data: clientes } = useGetClientes();
  const { data: pedidos } = useGetPedidos();
  const anonimizar = useAnonimizarCliente();
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c: any) => !t || c.nome.toLowerCase().includes(t) || String(c.telefone ?? '').includes(t),
    );
  }, [clientes, busca]);

  const atual = lista.find((c) => c.id === selecionado);
  // casar por id do cliente (contaRef) evita juntar homônimos; nome fica só para
  // pedidos antigos, que foram gravados antes do vínculo existir
  const pedidosDoCliente = (pedidos ?? []).filter((p: any) =>
    atual ? (p.contaRef ? p.contaRef === atual.id : p.cliente?.nome === atual.nome) : false,
  );
  const gasto = pedidosDoCliente.reduce((s, p) => s + p.total, 0);

  return (
    <>
      <div className="clientes-topo">
        <input
          className="campo"
          type="search"
          placeholder="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span className="nota">{lista.length} cliente(s)</span>
      </div>

      <div className="clientes">
        <div className="clientes__lista">
          <ul className="pedidos__itens">
            {lista.map((cliente) => (
              <li key={cliente.id}>
                <button
                  type="button"
                  className={['pedido-linha', cliente.id === selecionado ? 'pedido-linha--ativo' : ''].join(' ').trim()}
                  onClick={() => setSelecionado(cliente.id)}
                >
                  <span
                    className="pedido-linha__canal"
                    style={{ ['--canal' as string]: cliente.anonimizado ? '#7a736a' : '#4a7a55' }}
                  >
                    {cliente.anonimizado ? 'LGPD' : 'OK'}
                  </span>
                  <span className="pedido-linha__cliente">
                    <strong>{cliente.nome}</strong>
                    <span className="nota">
                      {cliente.anonimizado
                        ? 'anonimizado'
                        : `${cliente.telefone || 'sem telefone'} · ${cliente.enderecos.length} endereço(s)`}
                    </span>
                  </span>
                  <span className="nota">{dataCurta(cliente.criadoEm)}</span>
                </button>
              </li>
            ))}
          </ul>
          {lista.length === 0 && <p className="nota">Nenhum cliente encontrado.</p>}
        </div>

        <aside className="pedidos__detalhe">
          {atual ? (
            <div className="pedido-detalhe">
              <header className="pedido-detalhe__topo">
                <div>
                  <span className="nota">cliente</span>
                  <h2>{atual.nome}</h2>
                </div>
              </header>

              <dl className="pedido-detalhe__dados">
                <dt>Telefone</dt>
                <dd>{atual.telefone || '—'}</dd>
                <dt>Cadastro</dt>
                <dd>{dataCurta(atual.criadoEm)}</dd>
                <dt>Endereços</dt>
                <dd>{atual.enderecos.join(' · ') || '—'}</dd>
                <dt>Pedidos</dt>
                <dd>{pedidosDoCliente.length}</dd>
                <dt>Total gasto</dt>
                <dd>{brl(gasto)}</dd>
              </dl>

              <div className="pedido-detalhe__acoes">
                <button
                  type="button"
                  className="botao botao--perigo botao--mini"
                  disabled={atual.anonimizado || anonimizar.isPending}
                  onClick={() => anonimizar.mutate(atual.id)}
                >
                  Anonimizar (LGPD)
                </button>
              </div>
            </div>
          ) : (
            <div className="pedidos__vazio">
              <span className="nota">Selecione um cliente para ver os dados.</span>
            </div>
          )}
        </aside>
      </div>
    </>
  );
};
