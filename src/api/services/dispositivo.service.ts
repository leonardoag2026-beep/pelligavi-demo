const CHAVE = 'pelligavi.dispositivo';

const gerar = (): string => {
  const pronto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
  const bruto = pronto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `dev_${bruto.replace(/-/g, '').slice(0, 24)}`;
};

let emMemoria = '';

export const tokenBase = (): string => {
  if (emMemoria) return emMemoria;
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) {
      emMemoria = salvo;
      return salvo;
    }
    const novo = gerar();
    localStorage.setItem(CHAVE, novo);
    emMemoria = novo;
    return novo;
  } catch {
    if (!emMemoria) emMemoria = gerar();
    return emMemoria;
  }
};

export const dispositivoService = { tokenBase };
