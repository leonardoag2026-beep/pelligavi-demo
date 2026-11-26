interface ConfMini { cor: string; forma: string; detalhe?: string }

const MINI: Record<string, ConfMini> = {
  calabresa: { cor: '#8a3a25', forma: 'disco', detalhe: '#e0b08c' },
  pepperoni: { cor: '#962f24', forma: 'disco', detalhe: '#e6b193' },
  mussarela: { cor: '#f7e7c1', forma: 'bola' },
  provolone: { cor: '#eccf8f', forma: 'bola' },
  gorgonzola: { cor: '#f0e7cf', forma: 'pedaco', detalhe: '#6d8f95' },
  parmesao: { cor: '#e2d09c', forma: 'raspas' },
  bacon: { cor: '#8a3524', forma: 'tira', detalhe: '#f0e2cc' },
  presunto: { cor: '#c98680', forma: 'tira', detalhe: '#e9c3bd' },
  lombo: { cor: '#dfb39a', forma: 'disco', detalhe: '#f0d3c2' },
  camarao: { cor: '#ef9d86', forma: 'camarao' },
  azeitona: { cor: '#3a3230', forma: 'anel' },
  'azeitona-verde': { cor: '#7e8f45', forma: 'anel' },
  cebola: { cor: '#c9a6c4', forma: 'anel', detalhe: '#e7d3e4' },
  'cebola-caramelo': { cor: '#a4713a', forma: 'fita' },
  tomate: { cor: '#c2402f', forma: 'disco', detalhe: '#e5a294' },
  'tomate-seco': { cor: '#8c2f22', forma: 'tira', detalhe: '#b8543f' },
  rucula: { cor: '#3d6b33', forma: 'folha' },
  basilico: { cor: '#3f6f34', forma: 'folha' },
  milho: { cor: '#f0c14b', forma: 'graos' },
  palmito: { cor: '#f0e3c2', forma: 'disco', detalhe: '#d9c69c' },
  champignon: { cor: '#d8c3a2', forma: 'cogumelo' },
  pimentao: { cor: '#4f7d3a', forma: 'fita' },
  berinjela: { cor: '#5b3a5e', forma: 'disco', detalhe: '#8d6a90' },
  abobrinha: { cor: '#93a86a', forma: 'disco', detalhe: '#c3d3a3' },
  alho: { cor: '#f3e6c4', forma: 'graos' },
  oregano: { cor: '#3d6b2c', forma: 'graos' },
  frango: { cor: '#b98d55', forma: 'fios' },
  'carne-seca': { cor: '#5a2c1c', forma: 'fios' },
  atum: { cor: '#b08a58', forma: 'fios' },
  catupiry: { cor: '#f4ecd8', forma: 'fio' },
};

const cache = new Map<string, string>();

const desenhar = (id: string, lado = 64): string => {
  const conf = MINI[id] || { cor: '#cfc6b4', forma: 'disco' };
  const c = document.createElement('canvas');
  c.width = lado;
  c.height = lado;
  const ctx = c.getContext('2d')!!;
  // o desenho é feito na grade de 64; escala para o tamanho pedido (256 = nítido nos cards)
  ctx.scale(lado / 64, lado / 64);
  const cx = 32;
  const cy = 32;

  ctx.fillStyle = conf.cor;
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 1;

  if (conf.forma === 'disco' || conf.forma === 'bola') {
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (conf.detalhe) {
      ctx.fillStyle = conf.detalhe;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (conf.forma === 'bola') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(cx - 8, cy - 9, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (conf.forma === 'anel') {
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.arc(cx, cy, 12, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  } else if (conf.forma === 'pedaco') {
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 6);
    ctx.lineTo(cx + 6, cy - 22);
    ctx.lineTo(cx + 22, cy + 4);
    ctx.lineTo(cx + 2, cy + 20);
    ctx.lineTo(cx - 18, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (conf.detalhe) {
      ctx.strokeStyle = conf.detalhe;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 2);
      ctx.lineTo(cx + 8, cy + 8);
      ctx.stroke();
    }
  } else if (conf.forma === 'tira') {
    ctx.beginPath();
    ctx.roundRect(cx - 26, cy - 9, 52, 18, 5);
    ctx.fill();
    ctx.stroke();
    if (conf.detalhe) {
      ctx.fillStyle = conf.detalhe;
      ctx.fillRect(cx - 22, cy - 5, 44, 3);
      ctx.fillRect(cx - 22, cy + 2, 44, 3);
    }
  } else if (conf.forma === 'fita') {
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 6, 48, 12, 6);
    ctx.fill();
    ctx.stroke();
  } else if (conf.forma === 'folha') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 13, 24, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 16);
    ctx.lineTo(cx + 8, cy - 16);
    ctx.stroke();
  } else if (conf.forma === 'camarao') {
    ctx.lineWidth = 9;
    ctx.strokeStyle = conf.cor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 17, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
    ctx.fillStyle = conf.cor;
    ctx.beginPath();
    ctx.moveTo(cx + 18, cy - 8);
    ctx.lineTo(cx + 30, cy + 2);
    ctx.lineTo(cx + 14, cy + 6);
    ctx.closePath();
    ctx.fill();
  } else if (conf.forma === 'cogumelo') {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 24, 17, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#efe3cf';
    ctx.fillRect(cx - 5, cy - 4, 10, 20);
  } else if (conf.forma === 'fios') {
    ctx.strokeStyle = conf.cor;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 2 + Math.random() * 1.6;
      const y = 12 + i * 6;
      ctx.beginPath();
      ctx.moveTo(10 + Math.random() * 6, y);
      ctx.quadraticCurveTo(32, y + 6, 54 - Math.random() * 6, y - 2);
      ctx.stroke();
    }
  } else if (conf.forma === 'raspas') {
    ctx.strokeStyle = conf.cor;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 2.4;
      const x = 12 + Math.random() * 40;
      const y = 12 + Math.random() * 40;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 + Math.random() * 8, y + 3 + Math.random() * 5);
      ctx.stroke();
    }
  } else if (conf.forma === 'fio') {
    ctx.strokeStyle = conf.cor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 40);
    ctx.bezierCurveTo(22, 12, 42, 50, 54, 22);
    ctx.stroke();
  } else {
    ctx.fillStyle = conf.cor;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(10 + Math.random() * 44, 10 + Math.random() * 44, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return c.toDataURL('image/png');
};

export const miniatura = (id: string, lado = 64): string => {
  const chave = `${id}:${lado}`;
  if (!cache.has(chave)) cache.set(chave, desenhar(id, lado));
  return cache.get(chave)!;
};
