let contexto: any = null;

const audio = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!contexto) contexto = new AC();
  if (contexto.state === 'suspended') contexto.resume().catch(() => {});
  return contexto;
};

export const desbloquearAudio = () => {
  audio();
};

export const tocarPedido = () => {
  const ac = audio();
  if (!ac) return false;
  const agora = ac.currentTime;
  const notas = [
    { freq: 784, atraso: 0, dur: 0.22 },
    { freq: 1046.5, atraso: 0.14, dur: 0.24 },
    { freq: 1568, atraso: 0.3, dur: 0.5 },
  ];
  for (const nota of notas) {
    const osc = ac.createOscillator();
    const ganho = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = nota.freq;
    const inicio = agora + nota.atraso;
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + nota.dur);
    osc.connect(ganho);
    ganho.connect(ac.destination);
    osc.start(inicio);
    osc.stop(inicio + nota.dur + 0.05);
  }
  return true;
};
