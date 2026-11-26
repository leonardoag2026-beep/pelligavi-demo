type Filho = Node | string | number | null | undefined | false;

export type Props = Record<string, any>;
export type Filhos = Filho | Filho[];

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, filhos?: Filhos): HTMLElementTagNameMap[K];
export function el(tag: string, props?: Props, filhos?: Filhos): HTMLElement;
export function el(tag: string, props: Props = {}, filhos: Filhos = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || valor === false) continue;
    if (chave === 'class') node.className = String(valor);
    else if (chave === 'html') node.innerHTML = String(valor);
    else if (chave === 'texto') node.textContent = String(valor);
    else if (chave === 'style' && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor as Record<string, string>)) {
        if (k.startsWith('--')) node.style.setProperty(k, v);
        else (node.style as any)[k] = v;
      }
    } else if (chave.startsWith('on') && typeof valor === 'function') {
      node.addEventListener(chave.slice(2).toLowerCase(), valor as EventListener);
    } else if (chave === 'dataset' && typeof valor === 'object') Object.assign(node.dataset, valor);
    else node.setAttribute(chave, String(valor));
  }
  const lista = Array.isArray(filhos) ? filhos : [filhos];
  for (const filho of lista.flat()) {
    if (filho == null || filho === false) continue;
    node.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return node;
}

export const svg = (conteudo: string, attrs: Record<string, string> = {}): SVGSVGElement => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.innerHTML = conteudo;
  return node;
};

export const limpar = <T extends Element>(node: T): T => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

export const toast = (texto: string, tipo = 'ok'): void => {
  const host = document.getElementById('toasts');
  if (!host) return;
  const item = el('div', { class: `toast toast--${tipo}` }, [
    el('span', { class: 'toast__marca' }),
    el('span', {}, texto),
  ]);
  host.append(item);
  setTimeout(() => item.classList.add('toast--sai'), 3200);
  setTimeout(() => item.remove(), 3700);
};

export interface OpcoesModal {
  titulo: string;
  corpo: Element | Element[];
  rodape?: Element | null;
  largura?: 'padrao' | 'grande';
  tema?: string;
  aoFechar?: () => void;
}

export interface ModalAberto {
  raiz: HTMLDivElement;
  fechar: () => void;
}

export const modal = ({ titulo, corpo, rodape, largura = 'padrao', tema, aoFechar }: OpcoesModal): ModalAberto => {
  const anterior = document.querySelector('.modal-aberto');
  if (anterior) anterior.remove();
  const fechar = (): void => {
    raiz.remove();
    document.body.classList.remove('sem-rolagem');
    aoFechar?.();
  };
  const raiz = el('div', { class: 'modal-aberto' }, [
    el('div', { class: 'modal-fundo', onclick: fechar }),
    el('div', { class: `modal modal--${largura} ${tema ? `modal--${tema}` : ''}`.trim() }, [
      el('header', { class: 'modal__topo' }, [
        el('h2', { class: 'modal__titulo' }, titulo),
        el('button', { class: 'icone-botao', type: 'button', 'aria-label': 'Fechar', onclick: fechar }, '✕'),
      ]),
      el('div', { class: 'modal__corpo' }, corpo),
      rodape ? el('footer', { class: 'modal__rodape' }, rodape) : null,
    ]),
  ]);
  document.body.append(raiz);
  document.body.classList.add('sem-rolagem');
  const aoTeclar = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      fechar();
      document.removeEventListener('keydown', aoTeclar);
    }
  };
  document.addEventListener('keydown', aoTeclar);
  return { raiz, fechar };
};

export interface CampoProps {
  rotulo: string;
  [chave: string]: any;
}

export const campo = ({ rotulo, ...props }: CampoProps): HTMLLabelElement => {
  const input = el('input', { class: 'campo', ...props });
  return el('label', { class: 'campo-bloco' }, [el('span', { class: 'campo-rotulo' }, rotulo), input]);
};
