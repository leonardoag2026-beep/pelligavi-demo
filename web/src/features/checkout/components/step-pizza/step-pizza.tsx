import { useGetCardapio } from '../../../cardapio/hooks/cardapio-api.hooks';
import { useCheckout } from '../../context/checkout-context';
import { brl } from '../../../../shared/utils/format';

export const StepPizza: React.FC = () => {
  const { data: cardapio, isLoading } = useGetCardapio();
  const checkout = useCheckout();

  if (isLoading) return <p style={{ opacity: 0.6 }}>Carregando cardápio…</p>;
  if (!cardapio) return <p style={{ color: 'var(--perigo)' }}>Cardápio indisponível.</p>;

  return (
    <>
      <section className="etapa__bloco">
        <h2 className="etapa__subtitulo">Tamanho</h2>
        <span className="nota">muda a massa e o preço</span>
        <div className="linha-entradas linha-entradas--3">
          {cardapio.tamanhos.map((t) => (
            <button
              key={t.id}
              type="button"
              className={["chip", checkout.tamanho?.id === t.id ? "chip--ativo" : ''].join(' ').trim()}
              onClick={() => checkout.definirTamanho(t)}
            >
              <strong>{t.nome}</strong>
              <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>{t.medida} · {t.fatias} fatias</span>
            </button>
          ))}
        </div>
      </section>

      <section className="etapa__bloco">
        <h2 className="etapa__subtitulo">Sabor</h2>
        <span className="nota">{checkout.tamanho ? `preço para ${checkout.tamanho.nome.toLowerCase()}` : 'escolha o tamanho primeiro'}</span>
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          {cardapio.sabores.map((s) => {
            const preco = checkout.tamanho ? s.precos[checkout.tamanho.id] ?? 0 : 0;
            return (
              <button
                key={s.id}
                type="button"
                className="catalogo__linha"
                style={checkout.sabor?.id === s.id ? { borderColor: 'var(--accent)', background: 'rgba(211, 58, 44, 0.1)' } : undefined}
                onClick={() => checkout.definirSabor(s)}
              >
                <span style={{ display: 'grid', gap: 2 }}>
                  <strong>{s.nome}</strong>
                  <span style={{ fontSize: '0.74rem', opacity: 0.6 }}>{s.itens.join(' · ')}</span>
                </span>
                <strong style={{ color: 'var(--dourado)' }}>{checkout.tamanho ? brl(preco) : '—'}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="etapa__bloco">
        <h2 className="etapa__subtitulo">Borda</h2>
        <span className="nota">opcional</span>
        <div className="linha-entradas linha-entradas--3">
          <button
            type="button"
            className={["chip", !checkout.borda ? "chip--ativo" : ''].join(' ').trim()}
            onClick={() => checkout.definirBorda(null)}
          >
            <strong>Tradicional</strong>
            <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>inclusa</span>
          </button>
          {cardapio.bordas.filter((b) => b.preco > 0).map((b) => (
            <button
              key={b.id}
              type="button"
              className={["chip", checkout.borda?.id === b.id ? "chip--ativo" : ''].join(' ').trim()}
              onClick={() => checkout.definirBorda(b)}
            >
              <strong>{b.nome}</strong>
              <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>+ {brl(b.preco)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="etapa__bloco">
        <h2 className="etapa__subtitulo">Bebidas</h2>
        <span className="nota">entram no mesmo pedido</span>
        <div className="linha-entradas linha-entradas--3">
          {cardapio.bebidas.map((b) => {
            const escolhida = checkout.bebidas.find((x) => x.bebida.id === b.id)?.qtd ?? 0;
            return (
              <div key={b.id} className="bebida">
                <strong style={{ fontSize: '0.85rem' }}>{b.nome}</strong>
                <span style={{ fontSize: '0.74rem', opacity: 0.6 }}>{brl(b.preco)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => checkout.definirBebida(b, Math.max(0, escolhida - 1))}
                    style={{ background: 'none', border: '1px solid var(--bg-3)', borderRadius: 6, width: 24, cursor: 'pointer' }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '0.8rem', minWidth: 16, textAlign: 'center' }}>{escolhida}</span>
                  <button
                    type="button"
                    onClick={() => checkout.definirBebida(b, escolhida + 1)}
                    style={{ background: 'none', border: '1px solid var(--bg-3)', borderRadius: 6, width: 24, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      
    </>
  );
};
