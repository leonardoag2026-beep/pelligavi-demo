import { css } from '@emotion/css';
import { pizzaArt } from '../../../../shared/ui/art';

const caixa = css({
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: '6%',
  '& svg': { width: '100%', height: 'auto', display: 'block' },
});

interface PizzaArtProps {
  toppings?: string[];
  seed?: number;
}

/** Ilustração usada quando o WebGL não está disponível (mesma arte do demo antigo). */
export const PizzaArt: React.FC<PizzaArtProps> = ({ toppings = ['mussarela', 'pepperoni', 'basilico'], seed = 21 }) => (
  <div className={caixa} aria-hidden="true" dangerouslySetInnerHTML={{ __html: pizzaArt(toppings, seed) }} />
);
