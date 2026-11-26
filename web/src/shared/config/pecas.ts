import { renderDe } from './ingredientes';

// peças por porção vem de ingrediente_render.params.pecas (servidor completa ao gravar).
// Sem o campo, o ingrediente não tem contagem: 0 peças, nada de default aqui
export const pecasDe = (id: string): number => {
  const valor = Number((renderDe(String(id)) as Record<string, any>).pecas);
  return Number.isFinite(valor) && valor > 0 ? Math.min(240, Math.round(valor)) : 0;
};
