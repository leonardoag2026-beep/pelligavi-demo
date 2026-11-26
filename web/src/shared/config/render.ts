export type Geometria = 'auto' | 'fio' | 'rodela' | 'desfiado' | 'espalhado' | 'cubo' | 'stl';

export interface RenderConfig {
  geometria: Geometria;
  params: Record<string, number | string | boolean>;
  modelo?: string | null;
  textura?: string | null;
}

const CONFIG: Record<string, RenderConfig> = {};

export const definirRender = (mapa: Record<string, RenderConfig>) => {
  for (const [chave, valor] of Object.entries(mapa || {})) {
    if (!valor) continue;
    CONFIG[String(chave).toLowerCase()] = valor;
  }
};

export const renderDe = (id: string, nome?: string): RenderConfig | null => {
  const chave = String(id || '').toLowerCase();
  if (CONFIG[chave]) return CONFIG[chave]!;
  const porNome = String(nome || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (porNome && CONFIG[porNome]) return CONFIG[porNome]!;
  return null;
};
