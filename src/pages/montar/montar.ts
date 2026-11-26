import { el } from '../../shared/ui/dom.js';
import { renderEstudio } from '../../features/montagem/montagem.js';

let instancia: any = null;

export const renderMontar = (alvo: any, aoVoltar: any) => {
  alvo.append(el('div', { class: 'pagina-montar' }));
  instancia = renderEstudio(alvo.querySelector('.pagina-montar'), aoVoltar);
};

export const destruirMontar = () => {
  instancia?.destruir();
  instancia = null;
};
