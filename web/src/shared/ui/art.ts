// @ts-nocheck
interface Ponto { x: number; y: number }

const rng = (seed: number): (() => number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const TOPPINGS: Record<string, (p: Ponto, r: number) => string> = {
  pepperoni: (p, r) =>
    `<g><circle cx="${p.x}" cy="${p.y}" r="11" fill="#a5322a"/><circle cx="${p.x}" cy="${p.y}" r="11" fill="none" stroke="#7d2119" stroke-width="2"/><circle cx="${p.x - 3}" cy="${p.y - 3}" r="3" fill="#c05a4a" opacity=".7"/></g>`,
  calabresa: (p, r) =>
    `<g><circle cx="${p.x}" cy="${p.y}" r="10" fill="#9c3a26"/><circle cx="${p.x}" cy="${p.y}" r="5" fill="#c16448" opacity=".8"/></g>`,
  mussarela: (p, r) =>
    `<ellipse cx="${p.x}" cy="${p.y}" rx="15" ry="10" fill="#fdf1d2" opacity=".72" transform="rotate(${r * 180} ${p.x} ${p.y})"/><ellipse cx="${p.x + 2}" cy="${p.y + 1}" rx="9" ry="6" fill="#fff8e3" opacity=".5" transform="rotate(${r * 180} ${p.x} ${p.y})"/>`,
  basilico: (p, r) =>
    `<path d="M${p.x} ${p.y - 9} q9 5 0 16 q-9 -11 0 -16z" fill="#4e7a3a" transform="rotate(${r * 360} ${p.x} ${p.y})"/>`,
  cebola: (p, r) =>
    `<path d="M${p.x - 12} ${p.y} a12 12 0 0 1 24 0" fill="none" stroke="#cbb0d4" stroke-width="3" stroke-linecap="round"/>`,
  azeitona: (p, r) =>
    `<g><circle cx="${p.x}" cy="${p.y}" r="7" fill="#3c2c31"/><circle cx="${p.x}" cy="${p.y}" r="2.6" fill="#8d6f60"/></g>`,
  presunto: (p, r) =>
    `<rect x="${p.x - 11}" y="${p.y - 7}" width="22" height="14" rx="6" fill="#d98d8d" transform="rotate(${r * 60} ${p.x} ${p.y})"/>`,
  ovo: (p, r) =>
    `<g><circle cx="${p.x}" cy="${p.y}" r="9" fill="#f6ecd0"/><circle cx="${p.x}" cy="${p.y}" r="4" fill="#e0b048"/></g>`,
  abobrinha: (p, r) =>
    `<ellipse cx="${p.x}" cy="${p.y}" rx="13" ry="5" fill="#7f9c4a" transform="rotate(${r * 180} ${p.x} ${p.y})"/>`,
  tomate: (p, r) =>
    `<g><circle cx="${p.x}" cy="${p.y}" r="9" fill="#c9463a"/><circle cx="${p.x - 2}" cy="${p.y - 2}" r="2" fill="#e79a86"/></g>`,
  rucula: (p, r) =>
    `<path d="M${p.x} ${p.y - 8} q10 8 0 15 q-10 -7 0 -15z" fill="#435f27" transform="rotate(${r * 360} ${p.x} ${p.y})"/>`,
  catupiry: (p, r) =>
    `<ellipse cx="${p.x}" cy="${p.y}" rx="13" ry="10" fill="#f6ecd4" opacity=".85"/>`,
};

export const pizzaArt = (toppings: string[] = [], seed = 11): string => {
  const rand = rng(seed * 977 + toppings.length * 31 + 7);
  const grade = () => {
    const pts: Ponto[] = [];
    for (let y = 22; y <= 218; y += 20) {
      const desloc = (Math.round(y / 20) % 2) * 10;
      for (let x = 22 + desloc; x <= 218; x += 20) {
        const dx = x - 120;
        const dy = y - 120;
        if (Math.hypot(dx, dy) < 76) pts.push({ x: x + (rand() - 0.5) * 5, y: y + (rand() - 0.5) * 5 });
      }
    }
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pts[i], pts[j]] = [pts[j]!, pts[i]!];
    }
    return pts;
  };
  const pontos = grade();
  let passo = 0;
  const espiral = () => {
    const p = pontos[passo % pontos.length];
    passo += 1;
    return p;
  };
  const marcas = Array.from({ length: 9 }, () => {
    const ang = rand() * Math.PI * 2;
    return `<circle cx="${120 + Math.cos(ang) * 104}" cy="${120 + Math.sin(ang) * 104}" r="${1.5 + rand() * 3}" fill="#8c5a2b" opacity=".35"/>`;
  }).join('');
  const qtdDe = (nome: string): number => (nome === 'mussarela' ? 5 : nome === 'pepperoni' ? 8 : 7);
  const filas = toppings
    .filter((nome) => TOPPINGS[nome])
    .map((nome) => ({ nome, resto: qtdDe(nome) }));
  const camadas: string[] = [];
  while (filas.some((f) => f.resto > 0)) {
    for (const f of filas) {
      if (f.resto <= 0) continue;
      camadas.push(TOPPINGS[f.nome](espiral(), rand()));
      f.resto -= 1;
    }
  }
  return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">
    <defs>
      <radialGradient id="pz-fundo" cx="35%" cy="25%" r="85%">
        <stop offset="0" stop-color="#f6e6c8"/><stop offset="1" stop-color="#e3c9a0"/>
      </radialGradient>
      <radialGradient id="pz-massa" cx="38%" cy="30%" r="80%">
        <stop offset="0" stop-color="#eec98d"/><stop offset=".72" stop-color="#dfab63"/><stop offset="1" stop-color="#c98f49"/>
      </radialGradient>
      <radialGradient id="pz-queijo" cx="34%" cy="26%" r="78%">
        <stop offset="0" stop-color="#f7dda2"/><stop offset=".65" stop-color="#efc987"/><stop offset="1" stop-color="#dfb878"/>
      </radialGradient>
    </defs>
    <circle cx="120" cy="120" r="118" fill="url(#pz-fundo)"/>
    <circle cx="120" cy="126" r="104" fill="#b98150" opacity=".28"/>
    <circle cx="120" cy="120" r="103" fill="url(#pz-massa)"/>
    ${marcas}
    <circle cx="120" cy="120" r="90" fill="#a83a26"/>
    <circle cx="120" cy="120" r="88" fill="#b2402c" opacity=".5"/>
    <circle cx="120" cy="119" r="84" fill="url(#pz-queijo)"/>
    ${camadas.join('')}
  </svg>`;
};

const LATA = (cor: string): string => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="200" height="200" fill="#f6e6c8"/>
  <ellipse cx="100" cy="176" rx="46" ry="8" fill="#00000018"/>
  <rect x="66" y="42" width="68" height="126" rx="10" fill="${cor}"/>
  <rect x="66" y="42" width="68" height="14" rx="7" fill="#ffffff33"/>
  <rect x="66" y="86" width="68" height="34" fill="#ffffff26"/>
  <rect x="66" y="154" width="68" height="14" rx="7" fill="#00000022"/>
</svg>`;

const GARRAFA = (cor: string): string => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="200" height="200" fill="#f6e6c8"/>
  <ellipse cx="100" cy="178" rx="34" ry="7" fill="#00000018"/>
  <path d="M86 34h28v22c0 14 18 20 18 44v62a12 12 0 0 1-12 12H80a12 12 0 0 1-12-12V100c0-24 18-30 18-44z" fill="${cor}"/>
  <rect x="84" y="26" width="32" height="12" rx="4" fill="#3b2b2f"/>
  <rect x="72" y="104" width="56" height="46" rx="6" fill="#ffffff2e"/>
  <rect x="76" y="126" width="48" height="4" rx="2" fill="#ffffff55"/>
  <rect x="76" y="136" width="34" height="4" rx="2" fill="#ffffff55"/>
</svg>`;

const COPO = (cor: string): string => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="200" height="200" fill="#f6e6c8"/>
  <ellipse cx="100" cy="178" rx="34" ry="7" fill="#00000018"/>
  <path d="M70 46h60l-8 118a10 10 0 0 1-10 9H88a10 10 0 0 1-10-9z" fill="#ffffff" opacity=".85"/>
  <path d="M74 76h52l-6 88a6 6 0 0 1-6 5H86a6 6 0 0 1-6-5z" fill="${cor}"/>
  <rect x="72" y="40" width="56" height="8" rx="4" fill="#ffffff"/>
</svg>`;

export const bebidaArt = (tipo: string): string => {
  if (tipo === 'lata') return LATA('#c9302c');
  if (tipo === 'copo') return COPO('#f0a52c');
  return GARRAFA('#3f6b3a');
};

export const montarArte = (alvo: Element, markup: string): void => {
  alvo.innerHTML = markup;
};
