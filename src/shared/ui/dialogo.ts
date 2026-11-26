import { el } from './dom.js';

interface JanelaDialogo {
  fundo: HTMLDivElement;
  janela: HTMLDivElement;
}

const caixa = (titulo: string, corpo: any, acoes: any): JanelaDialogo => {
  const fundo = el('div', { class: 'dlg__fundo' });
  const janela = el('div', { class: 'dlg' }, [
    el('header', { class: 'dlg__topo' }, [
      el('h2', {}, titulo),
      el('button', { type: 'button', class: 'dlg__x', onclick: () => fundo.remove() }, '✕'),
    ]),
    el('div', { class: 'dlg__corpo' }, corpo),
    el('div', { class: 'dlg__acoes' }, acoes),
  ]);
  fundo.append(janela);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });
  document.body.append(fundo);
  return { fundo, janela };
};

export interface OpcaoDialogo {
  valor: string;
  nome: string;
}

export interface CampoDialogo {
  chave: string;
  rotulo: string;
  tipo?: string;
  valor?: string;
  dica?: string;
  opcoes?: OpcaoDialogo[];
  aceita?: string;
  nota?: string;
}

export interface OpcoesCampos {
  titulo: string;
  campos: CampoDialogo[];
  rotuloOk?: string;
}

export const pedirCampos = ({ titulo, campos, rotuloOk = 'Salvar' }: OpcoesCampos): Promise<Record<string, string> | null> =>
  new Promise((resolve) => {
    const entradas = new Map<string, any>();
    const arquivos = new Map<string, string>();
    const corpo = campos.map((c) => {
      if (c.tipo === 'select') {
        const select = el('select', { class: 'dlg__campo' }, (c.opcoes || []).map((o) =>
          el('option', { value: o.valor, selected: o.valor === (c.valor ?? '') }, o.nome)));
        entradas.set(c.chave, select);
        return el('label', { class: 'dlg__bloco' }, [el('span', { class: 'dlg__rotulo' }, c.rotulo), select]);
      }
      const input = el('input', {
        class: 'dlg__campo', type: c.tipo === 'file' ? 'file' : c.tipo || 'text',
        value: c.tipo === 'file' ? undefined : c.valor ?? '',
        placeholder: c.dica || '',
        accept: c.aceita,
      });
      if (c.tipo === 'file') {
        input.addEventListener('change', () => {
          const arquivo = input.files?.[0];
          if (!arquivo) { arquivos.delete(c.chave); return; }
          const leitor = new FileReader();
          leitor.onload = () => {
            arquivos.set(c.chave, String(leitor.result || ''));
            const nome = arquivo.name;
            const alvo = document.querySelector('.dlg__arquivo');
            if (alvo) alvo.textContent = `${nome} (${Math.round(arquivo.size / 1024)} KB)`;
          };
          leitor.readAsDataURL(arquivo);
        });
      }
      entradas.set(c.chave, input);
      return el('label', { class: 'dlg__bloco' }, [
        el('span', { class: 'dlg__rotulo' }, c.rotulo),
        input,
        c.nota ? el('span', { class: 'dlg__nota dlg__arquivo' }, c.nota) : null,
      ].filter(Boolean) as any);
    });
    let fundo: HTMLDivElement;
    const janela = caixa(titulo, corpo, [
      el('button', { type: 'button', class: 'dlg__cancelar', onclick: () => { fundo.remove(); resolve(null); } }, 'Cancelar'),
      el('button', {
        type: 'button', class: 'dlg__ok',
        onclick: () => {
          const dados: Record<string, string> = {};
          entradas.forEach((input, chave) => { dados[chave] = String(input.value || '').trim(); });
          arquivos.forEach((valor, chave) => { dados[chave] = valor; });
          fundo.remove();
          resolve(dados);
        },
      }, rotuloOk),
    ]);
    fundo = janela.fundo;
    const primeiro = entradas.values().next().value as HTMLInputElement | undefined;
    setTimeout(() => primeiro?.focus(), 30);
  });

export interface OpcoesConfirmar {
  titulo: string;
  texto: string;
  rotuloOk?: string;
}

export const confirmar = ({ titulo, texto, rotuloOk = 'Confirmar' }: OpcoesConfirmar): Promise<boolean> =>
  new Promise((resolve) => {
    let fundo: HTMLDivElement;
    const janela = caixa(titulo, [el('p', { class: 'dlg__texto' }, texto)], [
      el('button', { type: 'button', class: 'dlg__cancelar', onclick: () => { fundo.remove(); resolve(false); } }, 'Cancelar'),
      el('button', { type: 'button', class: 'dlg__ok', onclick: () => { fundo.remove(); resolve(true); } }, rotuloOk),
    ]);
    fundo = janela.fundo;
  });
