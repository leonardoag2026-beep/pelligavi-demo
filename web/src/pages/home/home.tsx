import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brl } from '../../shared/utils/format';
import { useGetConfig } from '../../features/config/hooks/config-api.hooks';
import { instalarCrm } from '../../shared/styles/crm';

const PizzaCanvas = lazy(() =>
  import('../../features/montagem/components/pizza-canvas/pizza-canvas').then((m) => ({ default: m.PizzaCanvas }))
);
const PizzaArt = lazy(() =>
  import('../../features/montagem/components/pizza-art/pizza-art').then((m) => ({ default: m.PizzaArt }))
);

const SECOES_HERO = [
  [
    { nome: 'mussarela', qtd: 9 },
    { nome: 'pepperoni', qtd: 12 },
    { nome: 'basilico', qtd: 7 },
  ],
];

const Home: React.FC = () => {
  const { data: config } = useGetConfig();
  const prazo = config ? `${config.prazoEntregaMin} a ${config.prazoEntregaMax} min` : '';
  const freteGratis = config?.freteGratisAcima ? `frete grátis acima de ${brl(config.freteGratisAcima)}` : '';
  const raio = config ? `Entregamos em até ${config.raioEntregaKm} km da pizzaria` : '';
  const textos = config?.textos ?? [];
  const faixa = textos.filter((x) => x.grupo === 'faixa');
  const passosLoja = textos
    .filter((x) => x.grupo === 'passo')
    .map((x, i) => ({ n: String(i + 1).padStart(2, '0'), titulo: x.valor }));
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    instalarCrm();
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero__texto">
          <p className="hero__sobre">Napolitana de fermentação natural · forno a lenha</p>
          <h1>
            A sua pizza
            <br />
            <em>não está no cardápio.</em>
          </h1>
          <div className="hero__acoes">
            <button type="button" className="botao botao--primario botao--grande" onClick={() => navigate('/montar')}>
              Montar a minha pizza
            </button>
            <span className="hero__dica">{prazo ? `entrega ${prazo}` : ''}{prazo && freteGratis ? ' · ' : ''}{freteGratis}</span>
          </div>
          <p className="hero__raio">
            <span className="hero__raio-ponto" />
            {raio}
          </p>
        </div>

        <div className="hero__arte">
          <div className="hero__palco">
            <Suspense fallback={null}>
              <PizzaCanvas
                tamanhoId="g"
                partes={1}
                bordaId="tradicional"
                secoes={SECOES_HERO}
                variante="palco"
                aoMontar={() => setPronto(true)}
                fallback={<PizzaArt toppings={['pepperoni', 'basilico', 'mussarela']} seed={21} />}
              />
            </Suspense>
          </div>
          <span className="hero__etiqueta">arraste para girar</span>
          {!pronto && null}
        </div>
      </section>

      <section className="faixa">
        {faixa.map((item) => (
          <span key={item.chave}>{item.valor}</span>
        ))}
      </section>

      <section className="passos-loja">
        <header className="secao__topo">
          <h2>Como funciona</h2>
          <span className="secao__nota">três passos, nenhum aplicativo</span>
        </header>
        <div className="passos-grade">
          {passosLoja.map(({ n, titulo: tituloPasso }) => (
            <article key={n} className="passo-card">
              <span className="passo-card__numero">{n}</span>
              <h3>{tituloPasso}</h3>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;
