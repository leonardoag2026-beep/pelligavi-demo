export type Estado = Record<string, any>;

const CHAVE = 'forno.v1';

const ler = (): Estado | null => {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Estado) : null;
  } catch {
    return null;
  }
};

const gravar = (valor: Estado): void => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(valor));
  } catch {
    void 0;
  }
};

export const estado = (): Estado | null => ler();

export const atual = <T extends object>(padrao: T): T & Estado => {
  const salvo = ler();
  return salvo ? ({ ...padrao, ...salvo } as T & Estado) : (padrao as T & Estado);
};

export const salvar = <T extends Estado>(mutacao: (base: Estado) => T): T => {
  const base = ler() || {};
  const proximo = mutacao(base);
  gravar(proximo);
  window.dispatchEvent(new CustomEvent('forno:estado'));
  return proximo;
};

export const limpar = (): void => {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    void 0;
  }
  window.dispatchEvent(new CustomEvent('forno:estado'));
};

export const aoMudar = (fn: () => void): void => {
  window.addEventListener('forno:estado', fn);
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) fn();
  });
};
