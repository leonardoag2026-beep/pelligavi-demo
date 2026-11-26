import { useEffect, useState } from 'react';
import { useGetIngredientes, useGetRender } from '../../ingredientes/hooks/ingredientes-api.hooks';
import { definirModelos, definirRenderParams, depurarModelos, definirTipos } from '../../../shared/config/ingredientes';
import { definirRender, type RenderConfig } from '../../../shared/config/render';
import { prepararModelos, exportarPeca, exportarTextura } from '../../../shared/lib/pizza3d';

// Receita de render, malhas e classe de depósito vêm do servidor. Sem isso o motor não
// monta peça nenhuma — então todo canvas (home, estúdio, CRM) espera `pronto`.
export const useMotor3d = (): { pronto: boolean } => {
  const { data: render } = useGetRender();
  const { data: ingredientes } = useGetIngredientes();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!render?.length) return;
    const config: Record<string, RenderConfig> = {};
    const modelos: Record<string, { modelo?: string; textura?: string }> = {};
    const ajustes: Record<string, Record<string, unknown>> = {};

    for (const item of render) {
      const params = (item.params ?? {}) as Record<string, unknown>;
      config[item.id] = { geometria: (item.geometria ?? 'auto') as RenderConfig['geometria'], params: params as RenderConfig['params'], modelo: item.modeloUrl };
      if (item.modeloUrl || item.texturaUrl) {
        modelos[item.id] = { modelo: item.modeloUrl ?? undefined, textura: item.texturaUrl ?? undefined };
      }
      if (params && Object.keys(params).length) ajustes[item.id] = params;
    }
    definirRender(config);
    definirModelos(modelos);
    definirRenderParams(ajustes);
    setPronto(true);

    if (typeof window !== 'undefined') {
      (window as any).__pzModelos = depurarModelos;
      (window as any).__pzExportar = exportarPeca;
      (window as any).__pzExportarTextura = exportarTextura;
    }

    // o parser de STL é síncrono (data URL): baixa do servidor e registra de novo
    let vivo = true;
    void (async () => {
      const prontos: Record<string, { modelo?: string; textura?: string }> = { ...modelos };
      await Promise.all(
        Object.entries(modelos).map(async ([id, m]) => {
          if (!m.modelo || m.modelo.startsWith('data:') || !/\.stl($|\?)/i.test(m.modelo)) return;
          try {
            const resposta = await fetch(m.modelo);
            if (!resposta.ok) return;
            const bytes = new Uint8Array(await resposta.arrayBuffer());
            let binario = '';
            for (let i = 0; i < bytes.length; i += 0x8000) {
              binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            prontos[id] = { ...m, modelo: `data:model/stl;base64,${btoa(binario)}` };
          } catch {
            /* mantém procedural */
          }
        }),
      );
      if (vivo) definirModelos(prontos);
      void prepararModelos(Object.values(prontos).map((m) => m.modelo ?? ''));
    })();

    return () => {
      vivo = false;
    };
  }, [render]);

  useEffect(() => {
    if (!ingredientes?.length) return;
    const mapa: Record<string, string> = {};
    for (const item of ingredientes) {
      const classe = String(item.classe ?? '').toLowerCase();
      if (classe === 'rodela' || classe === 'desfiado' || classe === 'espalhado' || classe === 'fio') mapa[item.id] = classe;
    }
    definirTipos(mapa);
  }, [ingredientes]);

  return { pronto };
};

export default useMotor3d;
