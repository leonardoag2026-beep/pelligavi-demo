import { useState } from 'react';
import { TbArrowLeft } from 'react-icons/tb';
import { useEnviarMensagem, useGetConversas, useResolverConversa } from '../hooks/crm-api.hooks';
import { canal } from '../../../shared/config/canais';
import { horaCurta, iniciais } from '../../../shared/utils/format';

export const PainelConversas: React.FC = () => {
  const { data: conversas } = useGetConversas();
  const enviar = useEnviarMensagem();
  const resolver = useResolverConversa();
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  const lista = conversas ?? [];
  const selecionada = lista.find((c) => c.id === abertaId) ?? null;
  // no desktop a primeira já abre; no mobile a lista fica sozinha até o toque
  const aberta = selecionada ?? lista[0] ?? null;
  const lendo = Boolean(selecionada);

  const enviarTexto = () => {
    if (!aberta || !texto.trim()) return;
    enviar.mutate({ codigo: aberta.id, body: { texto: texto.trim() } });
    setTexto('');
  };

  return (
    <div className={['caixa-entrada', lendo ? 'caixa-entrada--lendo' : ''].join(' ').trim()}>
      <aside className="caixa-entrada__lista">
        <header className="caixa-entrada__topo">
          <h2>Conversas</h2>
          <span className="nota">{lista.filter((c) => c.status !== 'resolvida').length} abertas</span>
        </header>
        <ul>
          {lista.map((conversa) => {
            const c = canal(conversa.canal);
            const ultima = conversa.mensagens[conversa.mensagens.length - 1];
            return (
              <li key={conversa.id}>
                <button
                  type="button"
                  className={['item-conversa', conversa.id === selecionada?.id ? 'item-conversa--ativo' : ''].join(' ').trim()}
                  onClick={() => setAbertaId(conversa.id)}
                >
                  <span className="avatar">{iniciais(conversa.nome)}</span>
                  <div className="item-conversa__texto">
                    <strong>{conversa.nome}</strong>
                    <span className="nota">{ultima ? ultima.texto.slice(0, 42) : 'sem mensagens'}</span>
                  </div>
                  <div className="item-conversa__meta">
                    <span className="canal-selo canal-selo--mini" style={{ ['--canal' as string]: c.cor }}>
                      {c.nome}
                    </span>
                    {conversa.naoLidas > 0 && <span className="nao-lida">{conversa.naoLidas}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="caixa-entrada__painel">
        {!aberta ? (
          <div className="conversa-vazia">Nenhuma conversa.</div>
        ) : (
          <div className="conversa">
            <header className="conversa__topo">
              <button type="button" className="conversa__voltar" onClick={() => setAbertaId(null)} aria-label="Voltar para as conversas">
                <TbArrowLeft aria-hidden />
              </button>
              <div className="conversa__identidade">
                <span className="avatar">{iniciais(aberta.nome)}</span>
                <div>
                  <strong>{aberta.nome}</strong>
                  <span className="nota">
                    {canal(aberta.canal).nome}
                    {aberta.pedido ? ` · ${aberta.pedido}` : ''}
                  </span>
                </div>
              </div>
              <div className="conversa__acoes">
                <button
                  type="button"
                  className="botao botao--mini botao--fantasma"
                  disabled={aberta.status === 'resolvida' || resolver.isPending}
                  onClick={() => resolver.mutate(aberta.id)}
                >
                  {aberta.status === 'resolvida' ? 'Resolvida' : 'Resolver'}
                </button>
              </div>
            </header>

            <div className="conversa__historico">
              {aberta.mensagens.map((mensagem, indice) => (
                <div key={`${aberta.id}-${indice}`} className={['bolha', mensagem.de === 'loja' ? 'bolha--loja' : ''].join(' ').trim()}>
                  <span>{mensagem.texto}</span>
                  <span className="bolha__hora">{horaCurta(mensagem.em)}</span>
                </div>
              ))}
            </div>

            <div className="conversa__composer">
              <textarea
                className="campo campo--area"
                placeholder="Escreva a resposta"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button type="button" className="botao botao--primario botao--mini" onClick={enviarTexto} disabled={enviar.isPending}>
                Enviar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default PainelConversas;
