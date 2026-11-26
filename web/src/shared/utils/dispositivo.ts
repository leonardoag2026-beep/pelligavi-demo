const CHAVE = 'pelligavi.dispositivo';

/** Token que liga o pedido a este navegador (para "meus pedidos" sem conta). */
export const tokenDispositivo = (): string => {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return salvo;
    const novo = `dev_${crypto.randomUUID().slice(0, 18)}`;
    localStorage.setItem(CHAVE, novo);
    return novo;
  } catch {
    return 'dev_sem_storage';
  }
};
