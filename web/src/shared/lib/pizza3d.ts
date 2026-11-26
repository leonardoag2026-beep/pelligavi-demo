// @ts-nocheck
import {
  ajustarRender,
  modeloDe,
  padraoDe,
  particulaDe,
  receitaDe,
  renderDe as ajusteDe,
  texturaDe,
  tipoDe,
} from '../config/ingredientes.js';
import { lerSTLDeUrl, limitesSTL } from './stl.js';
import { renderDe } from '../config/render.js';

// three e cannon-es vêm do npm (Vite resolve), não mais de vendor copiado à mão
import * as three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as cannon from 'cannon-es';

const carregarThree = async () => three;
const carregarCannon = async () => cannon;

const CORES: Record<string, any> = {
  massa: '#e3b877',
  massaBaixa: '#d8a863',
  molho: '#a43227',
  queijo: '#e9c47c',
  queijoClaro: '#f7e2b4',
  catupiry: '#f7eed6',
  cheddar: '#e2a139',
  pepperoni: '#8f2c24',
  calabresa: '#7d3324',
  mussarela: '#fbeac0',
  basilico: '#415f2d',
  cebola: '#b891bd',
  azeitona: '#33262a',
  presunto: '#c97676',
  ovo: '#f2e6c6',
  gema: '#d9a441',
  abobrinha: '#6d8a3e',
  tomate: '#b03a30',
  rucula: '#365020',
  bacon: '#763224',
};

let semente = 1;
const semear = (valor: any) => {
  semente = valor >>> 0;
};
const rnd = () => {
  semente = (semente * 1664525 + 1013904223) >>> 0;
  return semente / 4294967296;
};
const aleatorio = (min: any, max: any) => min + rnd() * (max - min);

const RECHEIOS: Record<string, any> = { catupiry: '#f7eed6', cheddar: '#e2a139', mussarela: '#f6e3b4' };

const texturaSombra = (T: any) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,30,15,0.55)');
  grad.addColorStop(0.6, 'rgba(60,30,15,0.24)');
  grad.addColorStop(1, 'rgba(60,30,15,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(canvas);
};



// altura do queijo: o disco de queijo fica em y=0.088 e é ELE que a peça tem de encostar.
// O 0.132 que estava espalhado pelo arquivo vinha de uma massa mais alta e deixava todo
// topping pairando ~1 cm acima da pizza.
const PISO: number = 0.088;


const tipoDo = (nome: any) => tipoDe(String(nome || ''));

// quem desenha traco continuo e o ingrediente de classe 'fio' (vem do banco),
// nao uma lista fixa de nomes aqui no motor
// o banco grava 'fio' e também 'fios' (carne-seca, atum): plural é a mesma classe,
// senão o ingrediente cai no desenho sólido em vez do traço contínuo
const ehFio = (nome: any) => {
  const tipo = tipoDo(nome);
  return tipo === 'fio' || tipo === 'fios';
};

const paramsDe = (nome: any) => renderDe(String(nome || ''))?.params || {};

const caminhoFio = (T: any, partes = 1, indice = 0, obstaculos: any[] = [], alturaEm: any = null, forma: any = null) => {
  const R = 0.8;
  const faixas = forma && forma.faixas ? Number(forma.faixas) : 5;
  const theta = forma ? forma.theta : Math.random() * Math.PI;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const fase = forma ? forma.fase : Math.random() * 6.28;
  const lam = forma ? forma.lam : 0.3 + Math.random() * 0.12;
  const amp = forma ? forma.amp : 0.032 * (0.8 + Math.random() * 0.5);
  const desvio = forma && forma.desvio ? forma.desvio : 0;
  const meiaFaixa = forma && forma.meiaFaixa ? forma.meiaFaixa : 0;
  const paridade = forma && forma.paridade ? 1 : 0;
  const passo = forma && forma.passo ? Number(forma.passo) : 0.012;
  const pontos: any[] = [];
  if (partes > 1) {
    // com mais de um sabor o fio tem de preencher SÓ a fatia: serpentina em coordenadas
    // polares (arco × raio), indo e voltando entre as duas retas do corte
    const passoAng = (Math.PI * 2) / partes;
    const inicioAng = -Math.PI / 2 + indice * passoAng;
    const folga = Math.min(0.06, passoAng * 0.08);
    const a0 = inicioAng + folga;
    const a1 = inicioAng + passoAng - folga;
    const R0 = 0.14;
    const R1 = Math.min(0.66, R * 0.82);
    const faixasSetor: number = forma && forma.faixas ? Number(forma.faixas) : 6;
    for (let k = 0; k < faixasSetor; k += 1) {
      const r = faixasSetor === 1 ? (R0 + R1) / 2 : R0 + ((R1 - R0) * k) / (faixasSetor - 1);
      const arco = Math.abs(a1 - a0) * r;
      const n = Math.max(10, Math.ceil(arco / passo));
      const ida = k % 2 === 0;
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        const a = ida ? a0 + (a1 - a0) * t : a1 - (a1 - a0) * t;
        const rr = r + amp * Math.sin(t * Math.PI * 2 * (arco / lam) + fase + k * 0.8) * 0.6;
        pontos.push(new T.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr));
      }
    }
  } else {
    const topo = R * 0.86;
    const dy = (topo * 2) / faixas;
    for (let k = 0; k < faixas; k++) {
      const v = -topo + dy * (k + 0.5);
      const meia = Math.sqrt(Math.max(0, R * R - v * v)) * 0.99;
      const n = Math.max(12, Math.ceil((meia * 2) / passo));
      const direita = k % 2 === 0;
      for (let i = 0; i <= n; i++) {
        const u = -meia + (meia * 2) * (i / n);
        const uu = direita ? u : -u;
        const w = v + amp * Math.sin((uu * Math.PI * 2) / lam + fase + k * 0.8);
        pontos.push(new T.Vector3(uu * ct - w * st, 0, uu * st + w * ct));
      }
    }
  }

  for (let iter = 0; iter < 3; iter++) {
    const copia = pontos.map((p) => ({ x: p.x, z: p.z }));
    for (let i = 1; i < pontos.length - 1; i++) {
      pontos[i].x = copia[i].x * 0.4 + (copia[i - 1].x + copia[i + 1].x) * 0.3;
      pontos[i].z = copia[i].z * 0.4 + (copia[i - 1].z + copia[i + 1].z) * 0.3;
    }
  }

  const alturas = new Array(pontos.length).fill(0);
  if (obstaculos.length) {
    for (let i = 0; i < pontos.length; i++) {
      const p = pontos[i];
      let h = 0;
      for (const o of obstaculos) {
        const dx = p.x - o.x;
        const dz = p.z - o.z;
        const d = Math.hypot(dx, dz);
        const min = (o.raio || 0.05) + 0.055;
        if (d < min && d > 0.0001) {
          const k = (min - d) / d;
          p.x += dx * k;
          p.z += dz * k;
        }
        const alcance = (o.raio || 0.05) + 0.03;
        if (d < alcance) {
          const peso = 1 - Math.min(1, d / alcance) * 0.3;
          h = Math.max(h, (o.topo || 0.03) * peso * 0.8);
        }
      }
      alturas[i] = h;
    }
    const dilatadas = alturas.slice();
    for (let i = 0; i < alturas.length; i++) {
      let m = alturas[i];
      for (let k = -5; k <= 5; k++) {
        const j = i + k;
        if (j >= 0 && j < alturas.length && alturas[j] > m) m = alturas[j];
      }
      dilatadas[i] = m;
    }
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 1; i < pontos.length - 1; i++) {
        const a = pontos[i - 1];
        const b = pontos[i + 1];
        pontos[i].x = pontos[i].x * 0.4 + (a.x + b.x) * 0.3;
        pontos[i].z = pontos[i].z * 0.4 + (a.z + b.z) * 0.3;
        dilatadas[i] = dilatadas[i] * 0.5 + (dilatadas[i - 1] + dilatadas[i + 1]) * 0.25;
      }
    }
    for (let i = 0; i < alturas.length; i++) alturas[i] = dilatadas[i];
  }
  // o fio tem que pousar no que esta embaixo: sem isso ele passa por dentro de
  // rodela e desfiado (o y era fixo em 0,1, abaixo de qualquer topping)
  for (let i = 0; i < pontos.length; i++) {
    const base = alturaEm ? alturaEm(pontos[i].x, pontos[i].z) : PISO;
    // + raio do tubo: a curva e a LINHA DE CENTRO, entao ela tem que ficar um raio
    // acima da superficie para o tubo encostar em vez de afundar
    pontos[i].y = base + 0.03 + alturas[i] + 0.004 * Math.sin(i * 0.35);
  }

  for (const p of pontos) {
    const r = Math.hypot(p.x, p.z);
    if (r > R) {
      p.x *= R / r;
      p.z *= R / r;
    }
  }

  if (partes === 1) return pontos;
  const largura = (Math.PI * 2) / partes;
  const a0 = -Math.PI / 2 + indice * largura;
  const dentro = (pt: any) => {
    const a = (Math.atan2(pt.z, pt.x) - a0 + Math.PI * 4) % (Math.PI * 2);
    return a > 0.05 && a < largura - 0.05;
  };
  let melhor: any[] = [];
  let atual: any[] = [];
  for (const pt of pontos) {
    if (dentro(pt)) {
      atual.push(pt);
      if (atual.length > melhor.length) melhor = atual.slice();
    } else {
      atual = [];
    }
  }
  return melhor.length >= 8 ? melhor : pontos.filter(dentro);
};

const cor = (hex: any) => hex;

const desfiado = (T: any, padrao: any, cores: any, quantidade: any, raio: any, comprimento: any) => {
  const grupo = new T.Group();
  const base = aleatorio(0, Math.PI * 2);
  for (let i = 0; i < quantidade; i++) {
    const geo = new T.CapsuleGeometry(raio, comprimento, 3, 6);
    geo.rotateZ(Math.PI / 2);
    const fio = padrao(geo, cores[i % cores.length], [1, 0.5, 0.8], 0.9);
    const desvio = (i - (quantidade - 1) / 2) * (raio * 2.4);
    fio.position.set(
      Math.cos(base + Math.PI / 2) * desvio + aleatorio(-0.01, 0.01),
      0.012 + (i % 3) * 0.006,
      Math.sin(base + Math.PI / 2) * desvio + aleatorio(-0.01, 0.01)
    );
    fio.rotation.y = base + aleatorio(-0.45, 0.45);
    fio.rotation.z = aleatorio(-0.08, 0.08);
    grupo.add(fio);
  }
  return grupo;
};

const cacheTexturas = new Map();
const texturaFios = (T: any, cor: any) => {
  if (cacheTexturas.has(cor)) return cacheTexturas.get(cor);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = cor;
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const ang = Math.random() * Math.PI * 2;
    const comp = 34 + Math.random() * 55;
    ctx.globalAlpha = 0.8 + Math.random() * 0.2;
    ctx.lineWidth = 9 + Math.random() * 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang + 0.7) * comp * 0.5,
      y + Math.sin(ang + 0.7) * comp * 0.5,
      x + Math.cos(ang) * comp,
      y + Math.sin(ang) * comp
    );
    ctx.stroke();
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = false;
  tex.minFilter = T.LinearFilter;
  tex.magFilter = T.LinearFilter;
  cacheTexturas.set(cor, tex);
  return tex;
};

const cacheFios = new Map();
const malhaFios = (T: any, cor: any, tamanho: any) => {
  const chave = `${cor}|${tamanho}`;
  if (cacheFios.has(chave)) return cacheFios.get(chave).clone();
  const grupo = new T.Group();
  const material = new T.MeshStandardMaterial({
    map: texturaFios(T, cor),
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.92,
    side: T.DoubleSide,
  });
  for (let i = 0; i < 2; i++) {
    const placa = new T.Mesh(new T.PlaneGeometry(tamanho, tamanho * aleatorio(0.7, 1)), material);
    placa.rotation.x = -Math.PI / 2;
    placa.rotation.z = i * (Math.PI / 2) + aleatorio(-0.4, 0.4);
    placa.position.y = 0.006 + i * 0.004;
    grupo.add(placa);
  }
  cacheFios.set(chave, grupo);
  return grupo.clone();
};

const MOVEL = typeof window !== 'undefined' && (
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || Math.min(window.innerWidth || 999, window.innerHeight || 999) < 700
);
// orcamento por perfil: mobile tem fill rate baixo, pouca banda de memoria e esquenta
const PERFIL = MOVEL
  ? { dpr: 1.5, sombraLado: 1024, sombraSuave: false, sombraMapa: 1024, seg: 0.6, fios: 0.6, sombraFios: false }
  : { dpr: 2, sombraLado: 2048, sombraSuave: true, sombraMapa: 2048, seg: 1, fios: 1, sombraFios: true };

const seg = (n: number) => Math.max(6, Math.round(n * PERFIL.seg));

const cacheGeometrias = new Map();
const geoCacheada = (chave: string, criar: () => any) => {
  const achada = cacheGeometrias.get(chave);
  if (achada) return achada;
  const geo = criar();
  geo.userData.cacheada = true;
  cacheGeometrias.set(chave, geo);
  return geo;
};

const cacheLasca = new Map();
const geometriaLasca = (T: any) => {
  if (cacheLasca.has('lasca')) return cacheLasca.get('lasca');
  const pontos: any[] = [];
  const seg = 5;
  for (let i = 0; i <= seg; i += 1) {
    const u = i / seg;
    pontos.push(new T.Vector3(
      (u - 0.5) * 0.125,
      Math.sin(u * Math.PI) * 0.009,
      (Math.cos(u * 2.2) - 1) * 0.011
    ));
  }
  const curva = new T.CatmullRomCurve3(pontos);
  const geo = new T.TubeGeometry(curva, 10, 0.0055, 4, false);
  geo.scale(1, 0.55, 1.7);
  cacheLasca.set('lasca', geo);
  return geo;
};

const cacheToppings = new Map();

const texturaTopping = (T: any, nome: any, cor: any) => {
  const chave = padraoDe(String(nome));
  const idCache = `${nome}|${chave}|${cor}`;
  if (cacheToppings.has(idCache)) return cacheToppings.get(idCache);
  const N = 128;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, N, N);

  const claro = (a: any) => `rgba(255,255,255,${a})`;
  const escuro = (a: any) => `rgba(0,0,0,${a})`;
  const mancha = (x: any, y: any, r: any, estilo: any) => {
    ctx.fillStyle = estilo;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  if (chave === 'manchas') {
    for (let i = 0; i < 26; i++) mancha(Math.random() * N, Math.random() * N, 1.5 + Math.random() * 4, claro(0.22));
    for (let i = 0; i < 14; i++) mancha(Math.random() * N, Math.random() * N, 2 + Math.random() * 5, escuro(0.16));
    ctx.strokeStyle = escuro(0.35);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(N / 2, N / 2, N / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (chave === 'veias') {
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(70,110,120,${0.25 + Math.random() * 0.35})`;
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      let x = Math.random() * N;
      let y = Math.random() * N;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (Math.random() - 0.5) * 30;
        y += (Math.random() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (chave === 'fibras') {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = i % 3 === 0 ? claro(0.3) : escuro(0.12);
      ctx.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * N;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(N * 0.3, y + 4, N * 0.6, y - 4, N, y);
      ctx.stroke();
    }
    if (nome === 'bacon') {
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(247,238,222,${0.3 + Math.random() * 0.4})`;
        const larg = N * (0.05 + Math.random() * 0.2);
        const alt = N * (0.03 + Math.random() * 0.09);
        ctx.fillRect(Math.random() * N - larg * 0.5, Math.random() * N - alt * 0.5, larg, alt);
      }
    }
  } else if (chave === 'tomate') {
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      ctx.strokeStyle = escuro(0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(N / 2, N / 2);
      ctx.lineTo(N / 2 + Math.cos(ang) * N, N / 2 + Math.sin(ang) * N);
      ctx.stroke();
    }
    for (let i = 0; i < 22; i++) mancha(Math.random() * N, Math.random() * N, 1 + Math.random() * 2, 'rgba(250,230,180,0.55)');
  } else if (chave === 'aneis') {
    for (let i = 0; i < 30; i++) mancha(Math.random() * N, Math.random() * N, 1 + Math.random() * 2.5, claro(0.12));
    mancha(N * 0.35, N * 0.3, N * 0.12, claro(0.28));
  } else if (chave === 'argolas') {
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = i % 2 ? claro(0.22) : escuro(0.14);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(N / 2, N / 2, 8 + i * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (chave === 'conchas') {
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = i % 2 ? claro(0.3) : 'rgba(200,80,50,0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(N / 2, N / 2, 12 + i * 9, Math.PI * 0.15, Math.PI * 1.05);
      ctx.stroke();
    }
  } else if (chave === 'laminas') {
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = escuro(0.2);
      ctx.lineWidth = 2;
      const ang = (i / 20) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(N / 2, N / 2);
      ctx.lineTo(N / 2 + Math.cos(ang) * N * 0.6, N / 2 + Math.sin(ang) * N * 0.6);
      ctx.stroke();
    }
  } else if (chave === 'folhas') {
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = claro(0.22);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(N / 2, N);
      ctx.quadraticCurveTo(N / 2 + (Math.random() - 0.5) * 40, N / 2, N / 2 + (Math.random() - 0.5) * 30, 0);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 34; i++) mancha(Math.random() * N, Math.random() * N, 1.5 + Math.random() * 5, Math.random() < 0.5 ? claro(0.16) : escuro(0.1));
  }

  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 4;
  cacheToppings.set(idCache, tex);
  return tex;
};


// glb/gltf/obj/ply: carrega uma vez, normaliza para 0.18 unidades e clona por peça.
// os protótipos vivem no módulo para o CRM/montar poderem aquecer antes da cena começar
const protosFormato = new Map<string, any>();
const promessasFormato = new Map<string, Promise<any>>();

const carregarFormato = (url: string) => {
  const pronto = protosFormato.get(url);
  if (pronto) return pronto;
  if (promessasFormato.has(url)) return null;
  const extensao = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  const promessa = (async () => {
    let raiz: any = null;
    if (extensao === 'glb' || extensao === 'gltf') {
      const gltf: any = await new GLTFLoader().loadAsync(url);
      raiz = gltf.scene || (gltf.scenes && gltf.scenes[0]) || null;
    } else if (extensao === 'obj') {
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      raiz = await new OBJLoader().loadAsync(url);
    } else if (extensao === 'ply') {
      const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
      const geo = await new PLYLoader().loadAsync(url);
      geo.computeVertexNormals();
      raiz = new three.Mesh(geo, new three.MeshStandardMaterial({ vertexColors: true }));
    }
    if (!raiz) return null;
    // modelo exportado por nós já vem nas unidades da cena (~0.1–0.2): não mexer.
    // modelo de fora (Blender etc.) costuma vir em metros (1 unidade = 1 m): sem isso a
    // peça cobre a pizza inteira. Acima de 0.6 o arquivo é reduzido para caber na pizza
    let caixa = new three.Box3().setFromObject(raiz);
    const envelope0 = new three.Vector3();
    caixa.getSize(envelope0);
    const maior = Math.max(envelope0.x, envelope0.y, envelope0.z);
    if (maior > 0.6) {
      raiz.scale.multiplyScalar(0.18 / maior);
      caixa = new three.Box3().setFromObject(raiz);
    }
    const centro = new three.Vector3();
    caixa.getCenter(centro);
    const envelope = new three.Group();
    raiz.position.set(-centro.x, -caixa.min.y, -centro.z);
    envelope.add(raiz);
    protosFormato.set(url, envelope);
    return envelope;
  })();
  promessasFormato.set(url, promessa);
  void promessa.catch((erro) => console.warn('[pz] falha ao carregar modelo', url, erro));
  return null;
};

// aquece os modelos para a primeira peça já sair com a malha
export const prepararModelos = async (urls: string[]) => {
  await Promise.all(
    urls
      .filter((u) => u && !/\.stl($|\?)/i.test(u) && !u.startsWith('data:'))
      .map((u) => {
        carregarFormato(u);
        return promessasFormato.get(u) ?? Promise.resolve(null);
      })
  );
};

const cacheMateriais = new Map();
const cacheImagens = new Map();
const carregarTexturaImagem = (T: any, arquivo: any) => {
  if (cacheImagens.has(arquivo)) return cacheImagens.get(arquivo);
  const url = new URL(`../assets/texturas/${arquivo}`, import.meta.url).href;
  const tex = new T.TextureLoader().load(url);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 8;
  cacheImagens.set(arquivo, tex);
  return tex;
};

const cacheRemotas = new Map<string, any>();
const texturaRemota = (T: any, url: string, repeticao = 1) => {
  const chave = `${url}|${repeticao}`;
  const achada = cacheRemotas.get(chave);
  if (achada) return achada;
  const tex = new T.TextureLoader().load(url);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(repeticao, repeticao);
  cacheRemotas.set(chave, tex);
  return tex;
};

const materialCacheado = (T: any, corPeca: any, aspereza: any, nome: any) => {
  // textura do servidor é opt-in: a procedural já tem o desenho certo de cada ingrediente
  const remota = nome && ajusteDe(String(nome)).textura === true ? texturaDe(String(nome)) : null;
  // a textura exportada já vem na cor do ingrediente: tingir de novo multiplicava a cor
  const tinta = remota ? ajusteDe(String(nome)).tinta === true : false;
  const chave = `${corPeca}|${aspereza}|${nome || ''}|${remota || ''}|${tinta}`;
  let material = cacheMateriais.get(chave);
  if (!material) {
    material = new T.MeshStandardMaterial({ color: '#ffffff', roughness: aspereza, metalness: 0.02 });
    if (remota) {
      material.map = texturaRemota(T, remota, 1);
      material.color.set(tinta ? corPeca : '#ffffff');
    } else if (nome) {
      material.map = texturaTopping(T, nome, corPeca);
      material.color.set('#ffffff');
    } else {
      material.color.set(corPeca);
    }
    cacheMateriais.set(chave, material);
  }
  return material;
};

// a receita vem inteira do servidor. Sem geometria, sem medida obrigatória ou sem cor,
// o ingrediente não é montado: nada de tabela de default no cliente
const MEDIDAS_OBRIGATORIAS: Record<string, string[]> = {
  disco: ['raio', 'altura'],
  discoFoto: ['raio', 'altura'],
  rodela: ['raio', 'altura'],
  anel: ['raio', 'esp'],
  anelFino: ['raio', 'esp'],
  bola: ['raio'],
  pedaco: ['raio'],
  grao: ['raio'],
  cogumeloFatiado: ['raio'],
  camarao: ['raio'],
  cubo: ['aresta', 'alt'],
  tira: ['larg', 'prof', 'alt'],
  fita: ['larg', 'prof'],
  folha: ['comp', 'larg'],
  rasgada: ['comp', 'larg'],
  fios: [],
  fio: [],
};

const malhaTopping = (T: any, nome: any) => {
  const receita: Record<string, any> = receitaDe(String(nome));
  const tipo = String(receita.tipo ?? '');
  const exigidas = MEDIDAS_OBRIGATORIAS[tipo];
  if (!exigidas) {
    console.warn('[pz] ingrediente sem geometria no servidor', nome);
    return null;
  }
  const faltando = exigidas.filter((campo) => !(Number(receita[campo]) > 0));
  if (faltando.length || !receita.cor) {
    console.warn('[pz] receita incompleta no servidor', nome, faltando.join(',') || 'cor');
    return null;
  }
  const material = (aspereza = 0.72) => materialCacheado(T, receita.cor || '#e8c987', aspereza, nome);
  const malha = (geo: any, aspereza: any) => new T.Mesh(geo, material(aspereza));

  if (receita.tipo === 'discoFoto') {
    const geo = geoCacheada(`foto|${receita.raio}|${receita.altura}`, () => new T.CylinderGeometry(receita.raio, receita.raio * 0.96, receita.altura, seg(28)));
    const lateral = new T.MeshStandardMaterial({ color: '#c9523f', roughness: 0.55 });
    const face = new T.MeshStandardMaterial({
      map: carregarTexturaImagem(T, receita.imagem),
      color: receita.cor || '#c2402f',
      transparent: false,
      roughness: 0.45,
    });
    const m = new T.Mesh(geo, [lateral, face, lateral]);
    m.position.y = receita.altura / 2;
    return m;
  }

  if (receita.tipo === 'disco' || receita.tipo === 'rodela') {
    const geo = geoCacheada(`disco|${receita.raio}|${receita.altura}`, () => new T.CylinderGeometry(receita.raio, receita.raio * 0.98, receita.altura, seg(22)));
    const m = malha(geo, 0.68);
    m.position.y = receita.altura / 2;
    return m;
  }

  if (receita.tipo === 'bola') {
    const geo = geoCacheada(`bola|${receita.raio}`, () => new T.SphereGeometry(receita.raio, seg(18), seg(14)));
    const m = malha(geo, 0.5);
    m.scale.set(1, 0.82, 1);
    m.position.y = receita.raio * 0.82;
    return m;
  }

  if (receita.tipo === 'pedaco') {
    const geo = geoCacheada(`pedaco|${receita.raio}`, () => new T.DodecahedronGeometry(receita.raio, 0));
    const m = malha(geo, 0.62);
    m.scale.set(1, 0.7, 1.1);
    m.position.y = receita.raio * 0.6;
    return m;
  }

  if (receita.tipo === 'grao') {
    const r = receita.raio;
    const geo = geoCacheada(`grao|${r}`, () => {
      const g = new T.SphereGeometry(r, seg(12), seg(10));
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) / r + 1) * 0.5;
        const aperto = t > 0.45 ? 1 - (t - 0.45) * 1.1 : 1;
        pos.setX(i, pos.getX(i) * aperto);
        pos.setZ(i, pos.getZ(i) * aperto);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.45);
    m.scale.set(1, 0.76, 1.3);
    m.position.y = r * 0.68;
    return m;
  }

  if (receita.tipo === 'cubo') {
    const a = receita.aresta;
    const h = receita.alt;
    const geo = geoCacheada(`cubo|${a}|${h}`, () => {
      const g = new T.BoxGeometry(a, h, a, 2, 2, 2);
      const pos = g.attributes.position;
      const marca = (x: any, y: any, z: any) =>
        Math.sin(Math.round(x * 1e4) * 0.017 + Math.round(y * 1e4) * 0.031 + Math.round(z * 1e4) * 0.011);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const n = marca(x, y, z);
        pos.setXYZ(i, x + n * a * 0.04, y + n * h * 0.05, z + n * a * 0.04);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.6);
    m.position.y = h / 2;
    return m;
  }

  if (receita.tipo === 'tira') {
    const geo = geoCacheada(`tira|${receita.larg}|${receita.alt}|${receita.prof}`, () => {
      const g = new T.BoxGeometry(receita.larg, receita.alt, receita.prof, 3, 1, 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, pos.getY(i) + Math.sin((x / receita.larg) * Math.PI * 2) * 0.004);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.66);
    m.position.y = receita.alt / 2;
    return m;
  }

  if (receita.tipo === 'anel') {
    const grupo = new T.Group();
    const aro = new T.Mesh(geoCacheada(`anel|${receita.raio}|${receita.esp}`, () => new T.TorusGeometry(receita.raio, receita.esp, seg(8), seg(22))), material(0.55));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = receita.esp;
    grupo.add(aro);
    return grupo;
  }

  if (receita.tipo === 'anelFino') {
    const grupo = new T.Group();
    const aro = new T.Mesh(geoCacheada(`anelFino|${receita.raio}|${receita.esp}`, () => new T.TorusGeometry(receita.raio, receita.esp, seg(6), seg(26))), material(0.7));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = receita.esp;
    aro.scale.z = 0.55;
    grupo.add(aro);
    return grupo;
  }

  if (receita.tipo === 'folha') {
    const geo = geoCacheada(`folha|${receita.larg}|${receita.comp}`, () => {
      const g = new T.CircleGeometry(receita.larg / 2, seg(14));
      g.scale(1, receita.comp / receita.larg, 1);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        pos.setY(i, Math.cos((z / receita.comp) * Math.PI) * 0.012);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.8);
    m.material.side = T.DoubleSide;
    m.position.y = 0.006;
    return m;
  }

  if (receita.tipo === 'camarao') {
    const grupo = new T.Group();
    const corpo = new T.Mesh(new T.TorusGeometry(receita.raio, receita.raio * 0.42, 8, 14, Math.PI * 1.15), material(0.6));
    corpo.rotation.x = -Math.PI / 2;
    corpo.position.y = receita.raio * 0.42;
    grupo.add(corpo);
    const rabo = new T.Mesh(new T.ConeGeometry(receita.raio * 0.42, receita.raio * 1.1, 8), material(0.6));
    rabo.rotation.z = Math.PI / 2;
    rabo.position.set(receita.raio * 1.1, receita.raio * 0.3, 0);
    grupo.add(rabo);
    return grupo;
  }

  if (receita.tipo === 'cogumeloFatiado') {
    const r = receita.raio;
    const variante = Math.floor(Math.random() * 3);
    const geo = geoCacheada(`cogumeloFatiado|${r}|${variante}`, () => {
      // fatia de cogumelo: cunha do chapéu, nunca o cogumelo inteiro. Três aberturas
      // diferentes (quase meia-lua, dois terços, um quarto) para a porção não ficar uniforme
      const abertura = [Math.PI * 0.92, Math.PI * 0.66, Math.PI * 0.42][variante]!;
      const forma = new T.Shape();
      forma.absarc(0, 0, r * (1 - variante * 0.12), -abertura / 2, abertura / 2, false);
      forma.lineTo(0, 0);
      const g = new T.ExtrudeGeometry(forma, {
        depth: r * 0.32,
        bevelEnabled: true,
        bevelSize: r * 0.05,
        bevelThickness: r * 0.04,
        bevelSegments: 1,
        curveSegments: 12,
      });
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        // fatia de chapéu é curva: ondula a superfície para não virar disco plano
        pos.setY(i, pos.getY(i) + Math.sin((x / r) * 1.4 + variante) * r * 0.07 + Math.cos((z / r) * 1.2) * r * 0.04);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.76);
    m.scale.setScalar(0.78 + Math.random() * 0.4);
    m.position.y = 0.008;
    return m;
  }

  if (receita.tipo === 'rasgada') {
    const larg = receita.larg;
    const comp = receita.comp;
    const geo = geoCacheada(`rasgada|${larg}|${comp}`, () => {
      const tremor = (n: any) => {
        const v = Math.sin(n * 12.9898) * 43758.5453;
        return v - Math.floor(v);
      };
      const pontos: any[] = [];
      const LISO = 16;
      for (let i = 0; i <= LISO; i += 1) {
        const a = -Math.PI / 2 + (i / LISO) * Math.PI;
        pontos.push(new T.Vector2(Math.cos(a) * (larg / 2), Math.sin(a) * (comp / 2)));
      }
      const DENTES = 9;
      for (let i = 1; i < DENTES; i += 1) {
        const t = i / DENTES;
        const z = comp / 2 - t * comp + (tremor(i * 5.3) - 0.5) * comp * 0.05;
        const dente = 0.32 + tremor(i * 3.7) * 0.62;
        pontos.push(new T.Vector2(-(larg / 2) * Math.min(1, dente), z));
      }
      const g = new T.ShapeGeometry(new T.Shape(pontos), 4);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const borda = Math.min(1, Math.hypot(x / (larg / 2), z / (comp / 2)));
        pos.setY(i, borda * borda * comp * 0.16 + Math.sin(x * 41 + z * 27) * comp * 0.02);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.78);
    m.material.side = T.DoubleSide;
    m.position.y = 0.006;
    return m;
  }

  if (receita.tipo === 'fita') {
    const geo = geoCacheada(`fita|${receita.larg}|${receita.prof}`, () => {
      const g = new T.BoxGeometry(receita.larg, 0.009, receita.prof || 0.038, 8, 1, 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / receita.larg;
        pos.setZ(i, pos.getZ(i) + Math.sin(x * Math.PI * 2) * 0.018);
        pos.setY(i, pos.getY(i) + Math.cos(x * Math.PI) * 0.006);
      }
      g.computeVertexNormals();
      return g;
    });
    const m = malha(geo, 0.72);
    m.position.y = 0.006;
    return m;
  }

  if (receita.tipo === 'fios') {
    return malhaFios(T, receita.cor, 0.12);
  }

  return malha(new T.SphereGeometry(0.05, 12, 10), 0.7);
};

const contar = (lista: any) =>
  (lista || []).reduce((acc: any, item: any) => {
    const nome = typeof item === 'string' ? item : item.nome;
    const qtd = typeof item === 'string' ? 1 : item.qtd || 1;
    acc[nome] = (acc[nome] || 0) + qtd;
    return acc;
  }, {});

const gradeDePontos = (limite: any) => {
  const pontos: any[] = [];
  for (let z = -limite; z <= limite; z += 0.155) {
    const desloc = Math.round(z / 0.155) % 2 ? 0.0775 : 0;
    for (let x = -limite + desloc; x <= limite; x += 0.155) {
      const d = Math.hypot(x, z) / limite;
      if (d <= 0.95) pontos.push({ x, z, escala: 1 - d * 0.12 });
    }
  }
  return pontos;
};

export const criarForja = async (canvas: any, opcoes: any = {}) => {
  semear(20260101);
  let T;
  try {
    T = await carregarThree();
  } catch {
    return null;
  }

  let C = null;
  try {
    C = await carregarCannon();
  } catch {
    C = null;
  }

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PERFIL.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PERFIL.sombraSuave ? T.PCFSoftShadowMap : T.PCFShadowMap;

  const cena = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 3.62, 4.05);
  camera.lookAt(0, 0.16, 0);

  cena.add(new T.HemisphereLight('#fff2da', '#2a1a12', 1.15));
  const sol = new T.DirectionalLight('#ffd9a2', 2.25);
  sol.position.set(2.6, 4.4, 2.1);
  sol.castShadow = true;
  sol.shadow.mapSize.set(PERFIL.sombraLado, PERFIL.sombraLado);
  sol.shadow.camera.left = -1.15;
  sol.shadow.camera.right = 1.15;
  sol.shadow.camera.top = 1.15;
  sol.shadow.camera.bottom = -1.15;
  sol.shadow.camera.near = 0.5;
  sol.shadow.camera.far = 14;
  sol.shadow.bias = -0.0002;
  sol.shadow.normalBias = 0.002;
  cena.add(sol);
  const contra = new T.DirectionalLight('#a8c6ff', 0.8);
  contra.position.set(-3.2, 2.4, -2.6);
  cena.add(contra);

  const grupo = new T.Group();
  cena.add(grupo);
  const receberSombra = () => grupo.traverse((o: any) => { if (o.isMesh && !o.userData.particulas) o.receiveShadow = true; });

  const prato = new T.Mesh(
    new T.CylinderGeometry(1.52, 1.46, 0.07, 56),
    new T.MeshStandardMaterial({ color: '#2c2723', roughness: 0.55, metalness: 0.06 })
  );
  prato.position.y = -0.115;
  cena.add(prato);

  const aro = new T.Mesh(
    new T.TorusGeometry(1.48, 0.024, 8, 56),
    new T.MeshStandardMaterial({ color: '#4a4038', roughness: 0.4, metalness: 0.2 })
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = -0.08;
  cena.add(aro);

  const sombra = new T.Mesh(
    new T.PlaneGeometry(2.6, 2.6),
    new T.MeshBasicMaterial({ map: texturaSombra(T), transparent: true, depthWrite: false })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -0.075;
  sombra.scale.setScalar(1.12);
  cena.add(sombra);

  const massa = new T.Mesh(
    new T.CylinderGeometry(1, 1.02, 0.15, 72),
    new T.MeshStandardMaterial({ color: CORES.massa, roughness: 0.86, metalness: 0.02 })
  );
  grupo.add(massa);

  const ARCO_BORDA = Math.PI * 2 - 2.35;
  // a borda sobe um pouco acima do disco da massa: com o centro do cano abaixo da
  // superfície, a seção do corte ficava enterrada e o catupiry não aparecia no xray
  const ALTURA_BORDA = 0.045;
  const bordaMalha = new T.Mesh(
    new T.TorusGeometry(0.965, 0.132, 20, 72, ARCO_BORDA),
    new T.MeshStandardMaterial({ color: CORES.massaBaixa, roughness: 0.82 })
  );
  // giro escolhido para o vão do corte cair de frente para a câmera padrão
  bordaMalha.rotation.set(-Math.PI / 2, 0, 0.84);
  bordaMalha.position.y = ALTURA_BORDA;
  grupo.add(bordaMalha);

  // o arco é aberto (é o "xray" da borda). Sem tampa, o corte mostrava só a casca do
  // tubo e a borda parecia não ter grossura — dois discos fecham a seção
  const bordaCheia = new T.Mesh(
    new T.TorusGeometry(0.965, 0.132, 20, 72),
    new T.MeshStandardMaterial({ color: CORES.massaBaixa, roughness: 0.82 })
  );
  bordaCheia.rotation.x = -Math.PI / 2;
  bordaCheia.position.y = ALTURA_BORDA;
  grupo.add(bordaCheia);

  const recheioTampas: any[] = [];
  // SEÇÃO HORIZONTAL no vão do corte: é a única leitura que funciona vista de cima.
  // As tampas verticais nas pontas do arco têm normal horizontal — ficam de perfil para
  // a câmera de cima e nunca mostram grossura. Aqui o vão recebe um anel deitado
  // (massa) com o miolo do recheio, lido como se o tubo tivesse sido serrado no meio
  const tampasBorda = new T.Group();
  tampasBorda.rotation.copy(bordaMalha.rotation);
  tampasBorda.position.copy(bordaMalha.position);
  grupo.add(tampasBorda);

  // PAREDE INTERNA do cano: sem ela o tubo era uma casca de uma face só — olhando dentro
  // do corte via-se o fundo vazado e a leitura era de "túnel de papel". Com a superfície
  // interna some o vazado e a massa passa a ter espessura entre as duas paredes
  const bordaInterna = new T.Mesh(
    new T.TorusGeometry(0.965, 0.078, 16, 72, ARCO_BORDA),
    new T.MeshStandardMaterial({ color: CORES.massa, roughness: 0.95, side: T.BackSide, emissive: '#3a2814', emissiveIntensity: 0.5 })
  );
  bordaInterna.rotation.copy(bordaMalha.rotation);
  bordaInterna.position.copy(bordaMalha.position);
  bordaInterna.visible = false;
  tampasBorda.add(bordaInterna);

  const ARESTA = 0.086;
  const geoTampaParede = new T.RingGeometry(ARESTA, 0.132, 30);
  // a face do corte fica dentro do tubo, sem sol: sem emissivo ela renderiza quase preta
  // e a leitura é de buraco. Emissivo fraco devolve o bege da massa nessa face
  const matTampaParede = new T.MeshStandardMaterial({ color: CORES.massaBaixa, roughness: 0.9, side: T.DoubleSide, emissive: '#4a3418', emissiveIntensity: 0.55 });
  const matTampaRecheio = new T.MeshStandardMaterial({ color: '#fdf7e8', roughness: 0.55, side: T.DoubleSide, emissive: '#8f856f', emissiveIntensity: 0.55 });
  recheioTampas.push(matTampaRecheio);
  const geoTampaRecheioFuro = new T.CircleGeometry(ARESTA - 0.002, 26);
  for (const ang of [0, ARCO_BORDA]) {
    const centro = new T.Vector3(Math.cos(ang) * 0.965, Math.sin(ang) * 0.965, 0);
    const tangente = new T.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    const face = new T.Mesh(geoTampaParede, matTampaParede);
    face.position.copy(centro);
    face.lookAt(centro.clone().add(tangente));
    tampasBorda.add(face);
    // miolo: fecha o furo com o recheio, deixando o anel de massa (parede) à vista
    const miolo = new T.Mesh(geoTampaRecheioFuro, matTampaRecheio);
    miolo.position.copy(centro).add(tangente.clone().multiplyScalar(0.004));
    miolo.lookAt(centro.clone().add(tangente));
    tampasBorda.add(miolo);
  }

  // o recheio é o anel INTEIRO: o corte tira só a massa, e é justamente no vão que ele
  // aparece. Com o arco igual ao da massa ele sumia junto com o corte
  const recheioBorda = new T.Mesh(
    new T.TorusGeometry(0.965, 0.088, 16, 72),
    new T.MeshStandardMaterial({ color: RECHEIOS.catupiry, roughness: 0.6, emissive: '#6b6252', emissiveIntensity: 0.45 })
  );
  // mesma rotação da massa: com o anel inteiro e girado diferente, o recheio atravessava
  // o corte e cobria a parede de massa — a seção parecia fina como papel
  recheioBorda.rotation.copy(bordaMalha.rotation);
  recheioBorda.position.copy(bordaMalha.position);
  recheioBorda.renderOrder = 2;
  recheioBorda.visible = false;
  grupo.add(recheioBorda);


  const molho = new T.Mesh(
    new T.CircleGeometry(0.9, 72),
    new T.MeshStandardMaterial({ color: CORES.molho, roughness: 0.62 })
  );
  molho.rotation.x = -Math.PI / 2;
  molho.position.y = 0.079;
  grupo.add(molho);

  const queijo = new T.Mesh(
    new T.CircleGeometry(0.85, 72),
    new T.MeshStandardMaterial({ color: CORES.queijo, roughness: 0.52 })
  );
  queijo.rotation.x = -Math.PI / 2;
  queijo.position.y = 0.088;
  grupo.add(queijo);

  const bolhas: any[] = [];


  const cortes = new T.Group();
  grupo.add(cortes);

  const aroDestaque = new T.Mesh(
    new T.TorusGeometry(1.02, 0.03, 8, 48, Math.PI / 2),
    new T.MeshStandardMaterial({ color: '#ff6a4a', emissive: '#c93a20', emissiveIntensity: 0.45, roughness: 0.45 })
  );
  aroDestaque.position.y = 0.125;
  aroDestaque.visible = false;
  grupo.add(aroDestaque);

  let sujo = true;
  const secoes: any = [];
  const quedas: any[] = [];
  const fios: any = [];
  const corpos = new Map();
  const _centro = new T.Vector3();
  const sujas = new Set();
  const emissores: any = [];
  const _partePos = new T.Vector3();
  const _parteQuat = new T.Quaternion();
  const _parteEsc = new T.Vector3();
  const _parteMat = new T.Matrix4();
  const _eixoY = new T.Vector3(0, 1, 0);
  const _euler = new T.Euler();
  const _corTom = new T.Color();
  const _bicoAlvo = new T.Vector3();
  let ultimaCozinha = 0;
  const INCLINACAO_MAX = 0.62;
  const mundo = C ? new C.World({ gravity: new C.Vec3(0, -9.81, 0) }) : null;
  if (mundo) {
    mundo.broadphase = new C.SAPBroadphase(mundo);
    mundo.allowSleep = true;
    mundo.solver.iterations = 18;
    mundo.defaultContactMaterial.friction = 0.92;
    mundo.defaultContactMaterial.restitution = 0.02;
    mundo.defaultContactMaterial.contactEquationStiffness = 1e7;
    mundo.defaultContactMaterial.contactEquationRelaxation = 4;
    mundo.solver.tolerance = 0.0005;
    const chao = new C.Body({ mass: 0, shape: new C.Plane() });
    chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    chao.position.set(0, 0.094, 0);
    mundo.addBody(chao);
    // aro sólido sem frestas: as caixas se sobrepõem 30% para nenhuma peça escapar
    const lados = 40;
    const raioAro = 0.8;
    const larguraAro = ((2 * Math.PI * raioAro) / lados) * 1.3;
    for (let i = 0; i < lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      const corpo = new C.Body({ mass: 0, shape: new C.Box(new C.Vec3(larguraAro * 0.5, 0.09, 0.06)) });
      corpo.position.set(Math.cos(a) * raioAro, 0.17, Math.sin(a) * raioAro);
      corpo.quaternion.setFromEuler(0, -a, 0);
      mundo.addBody(corpo);
    }
    // massa: cilindro sólido sob o queijo, para nada afundar nem atravessar
    const base = new C.Body({
      mass: 0,
      shape: new C.Cylinder(0.78, 0.78, PISO, 24),
    });
    base.position.set(0, PISO / 2, 0);
    mundo.addBody(base);
  }
  const estado = {
    fatias: opcoes.fatias || 8,
    partes: opcoes.partes || 1,
    bordaId: opcoes.bordaId || 'tradicional',
    destaque: -1,
  };

  const pontos = gradeDePontos(0.68);
  const porSecao = new Map();
  const anguloDe = (partes: any, i: any) => (-Math.PI / 2 + (i * Math.PI * 2) / partes);

  const pontosDaSecao = (partes: any, indice: any) => {
    const chave = `p${partes}`;
    if (!porSecao.has(chave)) {
      const passo = (Math.PI * 2) / partes;
      const inicio = -Math.PI / 2;
      const baldes: any[][] = Array.from({ length: partes }, () => []);
      for (const ponto of pontos) {
        const ang = (Math.atan2(ponto.z, ponto.x) - inicio + Math.PI * 4) % (Math.PI * 2);
        const idx = Math.min(partes - 1, Math.floor(ang / passo));
        baldes[idx].push(ponto);
      }
      porSecao.set(chave, baldes);
    }
    return porSecao.get(chave)[indice % partes] || pontos;
  };


  // ---- posicionamento organizado -------------------------------------------------
  // Ingredientes de peça (rodela, anel, tira) não são jogados ao acaso: sentam em
  // coroas concêntricas dentro do setor, distribuídos por ângulo. O número de coroas
  // é o menor que comporta as peças sem sobrepor, e cada coroa recebe uma fatia
  // proporcional da quantidade.
  const RAIO_PECA = {
    calabresa: 0.046, pepperoni: 0.045, tomate: 0.05, 'tomate-seco': 0.04,
    azeitona: 0.019, 'azeitona-verde': 0.019, cebola: 0.034, 'cebola-caramelo': 0.04,
    palmito: 0.031, lombo: 0.04, berinjela: 0.036, abobrinha: 0.036,
    champignon: 0.034, mussarela: 0.032, provolone: 0.03, gorgonzola: 0.026,
    presunto: 0.048, bacon: 0.044, rucula: 0.05, basilico: 0.044,
    pimentao: 0.04, camarao: 0.048, milho: 0.011, alho: 0.013,
  };

  const RAIO_USO = 0.655;

  const CHAPADOS = new Set([
    'calabresa', 'pepperoni', 'tomate', 'azeitona', 'azeitona-verde', 'cebola',
    'cebola-caramelo', 'palmito', 'lombo', 'berinjela', 'abobrinha', 'champignon',
    'bacon', 'presunto', 'pimentao', 'tomate-seco', 'rucula', 'basilico', 'milho',
  ]);

  const cacheMedidas = new Map();
  const medidaDe = (nome: any) => {
    if (cacheMedidas.has(nome)) return cacheMedidas.get(nome);
    const m = malhaDoIngrediente(T, nome);
    m.updateMatrixWorld(true);
    const caixa = new T.Box3().setFromObject(m);
    const medida = {
      raio: Math.max(0.02, ((caixa.max.x - caixa.min.x) + (caixa.max.z - caixa.min.z)) * 0.25),
      topo: Math.max(0.01, caixa.max.y - caixa.min.y),
    };
    cacheMedidas.set(nome, medida);
    return medida;
  };

  const faseDoNome = (nome: any) => {
    let h = 7;
    for (let i = 0; i < nome.length; i += 1) h = (h * 31 + nome.charCodeAt(i)) % 997;
    return (h / 997) * Math.PI * 2;
  };

  // Peças chapadas (rodela, tira, folha): uma por fatia, e a próxima porção entra
  // deslocada meia rodela e uma camada abaixo — como telha.
  const mapaDoSetor = (partes: any, raioPeca: any) => {
    const fatias = Math.max(1, Math.round(8 / partes));
    const R = Math.max(0.12, 0.72 - raioPeca);
    const passo = raioPeca * 1.28;
    let aneis = 0;
    for (let r = R; r > 0.1; r -= passo) aneis += 1;
    aneis = Math.max(1, aneis);
    return { fatias, aneis, porCamada: fatias * aneis };
  };

  const shingleDoSetor = (partes: any, indice: any, quantidade: any, raioPeca: any, baseIdx = 0) => {
    const TAU = Math.PI * 2;
    const passo = TAU / partes;
    const inicio = -Math.PI / 2 + indice * passo;
    // uma rodela por fatia a cada porção: 8 fatias na pizza inteira, 4 na metade, 2 no quarto
    const fatias = Math.max(1, Math.round(8 / partes));
    const arco = passo / fatias;
    const RAIO_BORDA = Math.max(0.12, 0.70 - raioPeca);
    // passo da fieira: cada rodela avança 80% do próprio diâmetro, então a de baixo fica
    // com 20% aparecendo, como telha
    const passoFileira = raioPeca * 1.6;
    // quantas rodelas a fieira comporta da borda ao centro antes de subir um nível
    const porFileira = Math.max(1, Math.ceil((RAIO_BORDA - raioPeca * 0.4) / passoFileira) + 1);

    const pontos: any[] = [];
    for (let k = 0; k < quantidade; k += 1) {
      // uma porção = uma rodela por pedaço (fatias). Cada pedaço tem a sua fieira
      // radial: a 1ª porção põe as rodelas na borda, a 2ª põe a fileira seguinte
      // mais para dentro, seguindo a mesma linha, até a fieira encher — aí sobe nível
      const porcao = Math.floor(k / fatias);
      const fatia = k % fatias;
      const nivel = Math.floor(porcao / porFileira);
      const dentro = porcao % porFileira;
      const raio = Math.max(raioPeca * 0.4, RAIO_BORDA - passoFileira * dentro);
      const ang = inicio + arco * (fatia + 0.5);
      pontos.push({
        x: Math.cos(ang) * raio,
        z: Math.sin(ang) * raio,
        ang,
        giro: -(ang + Math.PI / 2),
        volta: nivel,
      });
    }
    return pontos;
  };

  const coroasDoSetor = (partes: any, indice: any, quantidade: any, raioPeca: any, fase = 0) => {
    const passo = (Math.PI * 2) / partes;
    const inicio = -Math.PI / 2 + indice * passo;
    const folga = Math.min(0.045, passo * 0.1);
    const a0 = inicio + folga;
    const arco = passo - folga * 2;

    const R0 = 0.16;
    const R1 = RAIO_USO;

    const montarCoroas = (k: any) => {
      const lista: any[] = [];
      let capacidade = 0;
      for (let j = 0; j < k; j += 1) {
        const r = k === 1 ? (R0 + R1) / 2 : R0 + ((R1 - R0) * j) / (k - 1);
        const cabe = Math.max(1, Math.floor((r * arco) / (raioPeca * 1.02)));
        lista.push({ r, cabe });
        capacidade += cabe;
      }
      return { lista, capacidade };
    };

    // número de coroas pela densidade e, se faltar espaço, pela capacidade
    let k = Math.max(1, Math.min(5, Math.ceil(Math.sqrt(quantidade / 3))));
    let coroas: any = montarCoroas(k);
    while (k < 5 && coroas.capacidade < quantidade) {
      k += 1;
      coroas = montarCoroas(k);
    }
    coroas = coroas.lista;

    const capacidade = coroas.reduce((s: any, c: any) => s + c.cabe, 0);
    const pontos: any = [];
    let restante = quantidade;

    coroas.forEach((coroa: any, j: any) => {
      if (restante <= 0) return;
      const ultima = j === coroas.length - 1;
      const quantos = ultima
        ? Math.min(restante, coroa.cabe)
        : Math.max(1, Math.min(restante, Math.round((coroa.cabe / capacidade) * quantidade)));
      restante -= quantos;
      for (let i = 0; i < quantos; i += 1) {
        const frac = quantos === 1 ? 0.5 : (i + 0.5) / quantos;
        const ang = a0 + ((arco * frac + fase) % arco);
        pontos.push({
          x: Math.cos(ang) * coroa.r,
          z: Math.sin(ang) * coroa.r,
          ang,
          giro: -(ang + Math.PI / 2),
        });
      }
    });

    return pontos;
  };

  // espalhado = punhado de unidades soltas distribuídas por IGUAL na área do setor.
  // Grade estratificada (anel + arco) com tremor determinístico, percorrida por um salto
  // coprimo com o total: cada porção nova cai nos vãos da anterior em vez de aglomerar.
  const espalhadoDoSetor = (partes: any, indice: any, quantidade: any, raioPeca: any) => {
    const passo = (Math.PI * 2) / partes;
    const inicio = -Math.PI / 2 + indice * passo;
    const R0 = 0.10;
    const R1 = Math.max(R0 + 0.08, 0.70 - raioPeca);
    const celula = Math.max(raioPeca * 2.4, 0.05);
    const mdc = (a: any, b: any): any => (b ? mdc(b, a % b) : a);
    const tremor = (n: any) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };

    const postos: any[] = [];
    let anel = 0;
    for (let r = R0; r <= R1 + 1e-6; r += celula * 0.92) {
      const arco = r * passo;
      const n = Math.max(1, Math.round(arco / celula));
      const meiaCasa = (anel % 2) * 0.35;
      for (let k = 0; k < n; k += 1) {
        const base = inicio + passo * ((k + 0.5 + meiaCasa) / n);
        const s1 = tremor(postos.length + 1);
        const s2 = tremor(postos.length + 17.3);
        const ang = base + (s1 - 0.5) * (passo / n) * 0.45;
        const raio = r + (s2 - 0.5) * celula * 0.4;
        postos.push({ x: Math.cos(ang) * raio, z: Math.sin(ang) * raio, ang, giro: -(ang + Math.PI / 2) });
      }
      anel += 1;
    }

    const total = postos.length;
    if (!total) return [];
    // seleção de baixa discrepância: ordenar pela parte fracionária de k·φ faz as primeiras
    // N vagas ficarem espalhadas pela lista inteira (e portanto pela área), não aglomeradas
    const phi = 0.6180339887498949;
    const ordem = postos
      .map((posto: any, k: any) => ({ posto, chave: (k * phi + 0.5) % 1 }))
      .sort((a: any, b: any) => a.chave - b.chave)
      .map((item: any) => item.posto);
    return ordem;
  };

  // topo do fio de catupiry passando por aqui: a peça tem de pousar EM CIMA do traço,
  // senão a rodela atravessa o tubo e a impressão é de que o catupiry está por baixo da massa
  const topoDoFio = (indice: any, x: any, z: any, folga: any) => {
    let topo = 0;
    const alcance = folga + 0.035;
    for (const f of (fios as any[])) {
      if (f.indice !== indice || !f.pontos) continue;
      for (let i = 0; i < f.pontos.length; i += 1) {
        const p = f.pontos[i];
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz <= alcance * alcance) {
          const altura = p.y + 0.034;
          if (altura > topo) topo = altura;
        }
      }
    }
    return topo;
  };

  // topo do que já está assentado sob o pé de uma peça nova (massa ou outra peça).
  // A peça cai por gravidade, mas nunca pode afundar abaixo disto.
  const topoMatriz = new T.Matrix4();
  const topoVetor = new T.Vector3();

  const topoDaPilha = (g: any, x: any, z: any, raioPeca: any, alcance: any = null) => {
    let topo = PISO;
    if (!g) return topo;
    for (const c of g.children) {
      if (c.userData.particulas || c.userData.cozido) continue;
      // so peca ASSENTADA serve de apoio: usar a previsao (alvoTopo) de uma peca que ainda
      // esta caindo empilha a leva inteira em escada (3 de 6 pecas pousavam 10 cm no ar)
      if (!c.userData.estatico || c.userData.topoCorpo == null) continue;
      const t = c.position.y + c.userData.topoCorpo;
      // raio de apoio curto: peça vizinha no MESMO anel não sustenta a do lado, senão o
      // anel inteiro sobe um degrau de rodela em rodela e tudo fica pairando. Rodela
      // empilhada em fieira passa alcance próprio, para pousar na de trás
      const r = alcance != null ? alcance : (c.userData.raio || 0.05) * 0.5 + raioPeca * 0.2;
      const dx = x - c.position.x;
      const dz = z - c.position.z;
      if (dx * dx + dz * dz <= r * r) topo = Math.max(topo, t);
    }
    // o ralado/desfiado tambem e apoio — mas só onde há floco de verdade. Usar o topo
    // da camada inteira levantava a peça sobre o vão entre flocos (flutuando até a
    // próxima porção chegar e reassentar tudo)
    const camadas = g.userData.particulas;
    if (camadas) {
      const alcanceF = raioPeca * 1.15;
      for (const chave of Object.keys(camadas)) {
        const inst: any = camadas[chave];
        if (!inst || !inst.count) continue;
        for (let k = 0; k < inst.count; k += 1) {
          inst.getMatrixAt(k, topoMatriz);
          topoVetor.setFromMatrixPosition(topoMatriz);
          const dx = x - topoVetor.x;
          const dz = z - topoVetor.z;
          if (dx * dx + dz * dz <= alcanceF * alcanceF) topo = Math.max(topo, topoVetor.y + 0.003);
        }
      }
    }
    const indiceFio = (secoes as any[]).indexOf(g);
    if (indiceFio >= 0) topo = Math.max(topo, topoDoFio(indiceFio, x, z, raioPeca * 0.75));
    return topo;
  };

  const escolherPonto = (lista: any, ocupados: any) => {
    if (!ocupados.length) return lista[Math.floor(Math.random() * lista.length)];
    let melhor = lista[0];
    let melhorDist = -1;
    for (const p of lista) {
      let dMin = Infinity;
      for (const q of ocupados) {
        const d = Math.hypot(p.x - q.x, p.z - q.z);
        if (d < dMin) dMin = d;
        if (dMin <= melhorDist) break;
      }
      if (dMin > melhorDist) {
        melhorDist = dMin;
        melhor = p;
      }
    }
    return melhor;
  };

  const cacheModelo = new Map<string, any>();

  const malhaDeModelo = (T: any, nome: any, modelo: any) => {
    const extensao = String(modelo.modelo || '').split('?')[0].split('.').pop()?.toLowerCase();
    if (extensao && extensao !== 'stl' && !String(modelo.modelo).startsWith('data:')) {
      const pronto = protosFormato.get(modelo.modelo) || carregarFormato(modelo.modelo);
      if (!pronto) return null;
      const copia = pronto.clone(true);
      const aj = ajusteDe(String(nome));
      const corBase = String(receitaDe(String(nome)).cor ?? '');
      if (!corBase) {
        console.warn('[pz] ingrediente sem cor no servidor', nome);
        return null;
      }
      const remota = aj.textura === true ? texturaDe(String(nome)) : null;
      // o GLB traz material/textura próprios: preservar quando o CRM pede o material do arquivo
      const doArquivo = aj.materialArquivo === true && !remota;
      if (doArquivo) {
        copia.traverse((o: any) => {
          if (!o.isMesh) return;
          o.material.side = T.DoubleSide;
        });
        return copia;
      }
      // mantém o padrão calibrado: textura do servidor quando pedida, senão a procedural
      const padrao = remota ? texturaRemota(T, remota, Number(aj.repeticao ?? 1)) : texturaTopping(T, String(nome), corBase);
      copia.traverse((o: any) => {
        if (!o.isMesh) return;
        o.material = new T.MeshStandardMaterial({
          color: remota && aj.tinta !== true ? new T.Color('#ffffff') : new T.Color(remota ? corBase : '#ffffff'),
          roughness: Number(aj.rugosidade ?? 0.72),
          metalness: Number(aj.metalico ?? 0.02),
          side: T.DoubleSide,
          map: padrao,
        });
      });
      return copia;
    }

    const chave = `stl|${nome}`;
    let base = cacheModelo.get(chave);
    if (!base) {
      const dados = lerSTLDeUrl(modelo.modelo);
      if (!dados) return null;
      const lim = limitesSTL(dados);
      const largX = lim.maxX - lim.minX || 1;
      const largZ = lim.maxZ - lim.minZ || 1;
      const escala = 0.18 / Math.max(largX, largZ);
      const cx = (lim.minX + lim.maxX) / 2;
      const cy = (lim.minY + lim.maxY) / 2;
      const cz = (lim.minZ + lim.maxZ) / 2;
      const pos = dados.posicoes;
      const nova = new Float32Array(pos.length);
      const uvs = new Float32Array((pos.length / 3) * 2);
      for (let i = 0, u = 0; i < pos.length; i += 3, u += 2) {
        nova[i] = (pos[i] - cx) * escala;
        nova[i + 1] = (pos[i + 1] - cy) * escala;
        nova[i + 2] = (pos[i + 2] - cz) * escala;
        uvs[u] = (pos[i] - lim.minX) / largX;
        uvs[u + 1] = 1 - (pos[i + 2] - lim.minZ) / largZ;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(nova, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      const aj = ajusteDe(String(nome));
      const material = new T.MeshStandardMaterial({
        roughness: Number(aj.rugosidade ?? 0.72),
        metalness: Number(aj.metalico ?? 0.02),
        side: T.DoubleSide,
      });
      const corBase = String(receitaDe(String(nome)).cor ?? '');
      if (modelo.textura) {
        const rep = Number(aj.repeticao ?? 1);
        material.map = texturaRemota(T, modelo.textura, rep);
        material.color = new T.Color(corBase);
      } else {
        material.color = new T.Color(corBase);
      }
      base = { geo, material };
      cacheModelo.set(chave, base);
    }
    const grupoModelo = new T.Group();
    grupoModelo.add(new T.Mesh(base.geo, base.material));
    return grupoModelo;
  };

  const malhaDoIngrediente = (T: any, nome: any) => {
    const modelo = ajusteDe(String(nome)).modelo === true ? modeloDe(String(nome)) : null;
    if (modelo && modelo.modelo) {
      const personalizada = malhaDeModelo(T, nome, modelo);
      if (personalizada) return personalizada;
    }
    return malhaTopping(T, nome);
  };

  const criarTopping = (nome: any, ponto: any, animar: any) => {
    const malha = malhaDoIngrediente(T, nome);
    // receita ausente no servidor = ingrediente não entra na cena
    if (!malha) return null;
    const aj = ajusteDe(String(nome));
    const variacao = Number(aj.variacao ?? 0);
    const escala = Number(ponto.escala) * Number(aj.escala ?? 1) * (variacao > 0 ? 1 + (Math.random() - 0.5) * variacao : 1);
    malha.scale.multiplyScalar(escala);
    malha.position.set(ponto.x, 0, ponto.z);
    grupo.add(malha);
    malha.updateMatrixWorld(true);
    const caixa = new T.Box3().setFromObject(malha);
    const altura = 0.088 + Math.max(0.02, caixa.max.y);
    const largX = caixa.max.x - caixa.min.x;
    const largZ = caixa.max.z - caixa.min.z;
    grupo.remove(malha);
    malha.userData.raio = Math.max(0.028, (largX + largZ) * 0.25);
    malha.position.set(
      ponto.x,
      animar ? Math.max(2.4, altura + 0.9) : altura,
      ponto.z,
    );
    const FOLHA = new Set(['rucula', 'basilico', 'pimentao']);
    const giroBase = Number.isFinite(ponto.giro) ? ponto.giro : rnd() * Math.PI * 2;
    malha.rotation.y = FOLHA.has(nome) ? giroBase + (rnd() - 0.5) * 1.3 : giroBase;
    // folha é chapa de duas faces: receber sombra nela mesma vira mancha cinza em cima do verde
    const chapa = FOLHA.has(nome);
    malha.traverse((o: any) => { if (o.isMesh) { o.castShadow = !chapa; o.receiveShadow = !chapa; } });
    malha.userData.nome = nome;
    malha.userData.altura = altura;
    malha.userData.giro = malha.rotation.y;
    malha.userData.base = malha.scale.y;
    malha.userData.achatado = 1;

    if (mundo && C) {
      malha.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(malha.matrixWorld).invert();
      const tmpM = new T.Matrix4();
      const filhos: any = [];
      malha.traverse((o: any) => {
        if (o.isMesh) filhos.push(o);
      });
      const caixaLocal = new T.Box3();
      const caixas: any[] = [];
      for (const filho of (filhos as any[])) {
        if (!filho.geometry.boundingBox) filho.geometry.computeBoundingBox();
        const bb = filho.geometry.boundingBox.clone();
        bb.applyMatrix4(tmpM.multiplyMatrices(inv, filho.matrixWorld));
        caixas.push({ filho, bb });
        caixaLocal.union(bb);
      }
      malha.userData.topo = Math.max(0.02, caixaLocal.max.y - caixaLocal.min.y);
      // topo do volume desta peca: usado por todo fio que precisa pousar EM CIMA dela
      malha.userData.maxYLocal = caixaLocal.max.y;
      malha.userData.minYLocal = caixaLocal.min.y;
      malha.userData.centroY = caixaLocal.getCenter(new T.Vector3()).y;
      // altura da peca acima/abaixo da ORIGEM DO CORPO (onde as formas foram centradas)
      malha.userData.topoCorpo = caixaLocal.max.y - malha.userData.centroY;
      malha.userData.baseCorpo = caixaLocal.min.y - malha.userData.centroY;
      malha.userData.alturaReal = Math.max(0.004, caixaLocal.max.y - caixaLocal.min.y);
      malha.userData.alvoTopo =
        (ponto.apoio != null ? ponto.apoio : PISO) + malha.userData.alturaReal;
      const centroTotal = caixaLocal.getCenter(new T.Vector3());
      const formas: any[] = [];
      for (const { filho, bb } of caixas) {
        const c = bb.getCenter(new T.Vector3());
        const tam = bb.getSize(new T.Vector3());
        const desloc = c.sub(centroTotal);
        const tipo = filho.geometry.type;
        let forma;
        if (tipo === 'CylinderGeometry') {
          const raio = Math.max(tam.x, tam.z) * 0.5;
          forma = new C.Cylinder(raio, raio, Math.max(tam.y, 0.01), 16);
        } else if (tipo === 'SphereGeometry') {
          forma = new C.Sphere(Math.max(tam.x, tam.y, tam.z) * 0.5);
        } else {
          forma = new C.Box(new C.Vec3(
            Math.max(tam.x * 0.5, 0.008),
            Math.max(tam.y * 0.55, 0.008),
            Math.max(tam.z * 0.5, 0.008)
          ));
        }
        formas.push({ forma, desloc });
      }
      if (formas.length) {
        const ancorada = Boolean(ponto.ancorado);
        const corpo = new C.Body({ mass: 0.16 });
        for (const f of formas) corpo.addShape(f.forma, new C.Vec3(f.desloc.x, f.desloc.y, f.desloc.z));
        // camada = espessura real da peça de baixo (≈3,5 mm na escala da cena),
        // para a rodela nova apoiar em cima em vez de atravessar
        const ESPESSURA = 0.02;
        const camadaPeca = Math.min(3, Math.max(0, ponto.camada || 0));
        const yBase = PISO + (ancorada ? camadaPeca * ESPESSURA : 0.002);
        const y0 = animar ? Math.max(2.4, yBase + 0.9) : yBase + 0.002;
        corpo.position.set(ponto.x, y0, ponto.z);
        corpo.quaternion.setFromEuler(0, malha.rotation.y, 0);
        corpo.linearDamping = 0.02;
        corpo.angularDamping = 0.86;
        corpo.allowSleep = false;
        corpo.sleepSpeedLimit = 0.08;
        corpo.sleepTimeLimit = 0.25;
        mundo.addBody(corpo);
        corpos.set(malha, corpo);
        malha.userData.centroLocal = centroTotal;
        malha.userData.travaXZ = { x: ponto.x, z: ponto.z };
        // o piso e em espaco de CORPO: a malha e desenhada deslocada por centroLocal,
        // entao sem somar esse deslocamento a peca afunda exatamente centroLocal.y
        // (era o camarao/azeitona/cebola entrando na rodela de baixo)
        if (ponto.apoio != null) {
          malha.userData.pisoCorpo = ponto.apoio - malha.userData.baseCorpo + centroTotal.y;
        }
        malha.userData.nasceuQ = performance.now();
        malha.position.set(
          ponto.x,
          (malha.userData.pouso || PISO) + (malha.userData.quedaY || 0),
          ponto.z
        );

      }
    }

    if (animar) quedas.push(malha);
    return malha;
  };

  const formaDoFio = (g: any, passada = 0) => {
    if (!g) return null;
    if (!g.userData.formaFio) {
      g.userData.formaFio = {
        theta: Math.random() * Math.PI,
        fase: Math.random() * 6.28,
        lam: 0.3 + Math.random() * 0.12,
        amp: 0.032 * (0.8 + Math.random() * 0.5),
      };
    }
    const base = g.userData.formaFio;
    if (!passada) return base;
    // cada porção nova tem de MUDAR o desenho: gira, desloca a faixa e troca o sentido.
    // Sem isso a segunda porção desenhava exatamente por cima da primeira e nada acontecia.
    return {
      theta: base.theta + passada * 0.26,
      fase: base.fase + passada * 1.1,
      lam: base.lam * (1 - passada * 0.06),
      amp: base.amp * (1 + passada * 0.12),
      desvio: (passada % 2 ? 1 : -1) * 0.052 * Math.ceil(passada / 2),
      meiaFaixa: passada % 2 ? 0.5 : 0,
      paridade: passada % 2,
    };
  };

  const criarFio = (nome: any, indice: any, grupoSecao: any, passada = 0) => {
    const obstaculos: any[] = [];
    if (grupoSecao) {
      for (const c of grupoSecao.children) {
        if (c.userData && c.userData.raio && !c.userData.fio) {
          obstaculos.push({ x: c.position.x, z: c.position.z, raio: c.userData.raio, topo: c.userData.topo || 0.03 });
        }
      }
    }
    const alturaEm = (x: any, z: any) => alturaDaSuperficie(indice, x, z, null);
    const cfg = paramsDe(nome);
    const forma = { ...(formaDoFio(grupoSecao, passada) || {}), passo: cfg.passo, faixas: cfg.faixas };
    const curvaPontos = caminhoFio(T, estado.partes, indice, obstaculos, alturaEm, forma);
    if (curvaPontos.length < 4) return null;
    const curva = new T.CatmullRomCurve3(curvaPontos);
    const aj = ajusteDe(String(nome));
    // grossura do fio = raio da receita × escala do ingrediente
    const raioFio = (cfg.raio ? Number(cfg.raio) : 0.03) * Number(aj.escala ?? 1);
    const geo = new T.TubeGeometry(curva, 620, raioFio, 8, false);
    const remota = aj.textura === true ? texturaDe(String(nome)) : null;
    const material = new T.MeshStandardMaterial({
      // textura exportada já tem a cor: branco em cima dela; tinge só se pedido
      color: remota && aj.tinta !== true ? '#ffffff' : ((cfg.cor as string) || (nome === 'catupiry' ? '#f4ecd8' : '#e9c98f')),
      roughness: Number(aj.rugosidade ?? 0.88),
      metalness: Number(aj.metalico ?? 0.02),
    });
    if (remota) material.map = texturaRemota(T, remota, Number(aj.repeticao ?? 24));
    const malha = new T.Mesh(geo, material);
    malha.userData.nome = nome;
    malha.userData.fio = true;
    // o tubo fica na origem: para servir de apoio guardamos amostras do caminho
    malha.userData.fioRaio = raioFio;
    malha.userData.fioPontos = curvaPontos.filter((_: any, i: number) => i % 6 === 0);
    malha.castShadow = true;
    const total = geo.index.count;
    geo.setDrawRange(0, 0);
    const bico = new T.Mesh(
      new T.CylinderGeometry(0.025, 0.019, 0.06, 10),
      new T.MeshStandardMaterial({ color: (cfg.cor as string) || '#f7eed6', roughness: 0.4 })
    );
    bico.position.copy(curvaPontos[0]);
    bico.position.y = 0.2;
    grupo.add(malha);
    grupo.add(bico);
    fios.push({ malha, geo, bico, curva, pontos: curvaPontos, progresso: 0, total, indice, passada });
    return malha;
  };

  const garantirParticulas = (indice: any, nome: any, total: any) => {
    const g = secoes[indice];
    if (!g) return;
    const conf = particulaDe(String(nome));
    if (!Object.keys(conf).length) return;
    if (!conf.folha && !conf.raio) return;
    g.userData.particulas = g.userData.particulas || {};
    let inst = g.userData.particulas[nome];
    // 6 mil instâncias: com 1400 o desfiado parava de emitir por volta da 8a porção e o
    // ralado "sumia" no meio da pilha (o buffer enchia, não o espaço)
    const capacidade = 6000;
    if (!inst) {
      let geo;
      let material;
      // floco é sprite recortado por alpha: a textura procedural é a única que traz o
      // recorte (a textura do servidor é opaca e viraria um quadrado branco)
      if (conf.folha) {
        geo = new T.PlaneGeometry(conf.tamanho, conf.tamanho);
        geo.rotateX(-Math.PI / 2);
        material = new T.MeshStandardMaterial({
          map: texturaFios(T, conf.cor ?? receitaDe(String(nome)).cor ?? '#d9a35b'),
          transparent: true,
          alphaTest: 0.4,
          roughness: 0.9,
          side: T.DoubleSide,
        });
      } else {
        geo = new T.SphereGeometry(conf.raio, 6, 4);
        geo.scale(1, 0.5, 1);
        material = new T.MeshStandardMaterial({ color: conf.cor, roughness: 0.6 });
      }
      inst = new T.InstancedMesh(geo, material, capacidade);
      inst.count = 0;
      inst.userData.nome = nome;
      inst.userData.particulas = true;
      inst.castShadow = false;
      inst.receiveShadow = true;
      inst.frustumCulled = false;
      g.add(inst);
      g.userData.particulas[nome] = inst;
    }
    if (conf.folha) return;
    const lista = pontosDaSecao(estado.partes, indice);
    const matriz = new T.Matrix4();
    const quat = new T.Quaternion();
    const pos = new T.Vector3();
    const esc = new T.Vector3();
    const por = conf.porPeca || 1;
    const n = Math.min(capacidade, total * por);
    for (let k = 0; k < n; k++) {
      const base = lista[(k * 13 + 7) % lista.length] || { x: 0, z: 0 };
      pos.set(
        base.x + aleatorio(-0.05, 0.05),
        alturaDaSuperficie(indice, base.x, base.z) + 0.002 + aleatorio(0, 0.004),
        base.z + aleatorio(-0.05, 0.05)
      );
      quat.setFromAxisAngle(new T.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      const s2 = 0.7 + Math.random() * 0.8;
      esc.set(s2 * 1.45, 0.7 + Math.random() * 0.5, s2);
      matriz.compose(pos, quat, esc);
      inst.setMatrixAt(k, matriz);
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
  };

  const removerFio = (indice: any) => {
    for (let k = fios.length - 1; k >= 0; k--) {
      if (fios[k].indice !== indice) continue;
      const f = fios[k];
      grupo.remove(f.malha);
      grupo.remove(f.bico);
      f.malha.geometry.dispose();
      f.malha.material.dispose();
      f.bico.geometry.dispose();
      f.bico.material.dispose();
      fios.splice(k, 1);
      return true;
    }
    return false;
  };

  const refazerFiosDaSecao = (indice: any) => {
    for (const f of (fios as any[])) {
      if (f.indice !== indice) continue;
      const alturaEm = (x: any, z: any) => alturaDaSuperficie(indice, x, z, null);
      const pontos = caminhoFio(T, estado.partes, indice, [], alturaEm, formaDoFio(secoes[indice], f.passada || 0));
      if (pontos.length < 4) continue;
      // suaviza a altura: subir e descer em cada rodela vira serra
      const ys = pontos.map((p: any) => p.y);
      // dilata (pega o maior apoio na vizinhanca, para nao cortar a rodela no meio)
      // e depois suaviza, senao a curva vira escada em cima de cada peca
      const dilatado = ys.map((_: any, i: number) => {
        let m = ys[i];
        for (let k = -4; k <= 4; k += 1) {
          const j = i + k;
          if (j >= 0 && j < ys.length && ys[j] > m) m = ys[j];
        }
        return m;
      });
      const suave = dilatado.map((_: any, i: number) => {
        let soma = 0;
        let n = 0;
        for (let k = -3; k <= 3; k += 1) {
          const j = i + k;
          if (j >= 0 && j < dilatado.length) { soma += dilatado[j]; n += 1; }
        }
        return soma / n;
      });
      pontos.forEach((p: any, i: number) => { p.y = suave[i]; });
      const curva = new T.CatmullRomCurve3(pontos);
      const cfgFio = paramsDe(f.malha.userData.nome);
      const ajFio = ajusteDe(String(f.malha.userData.nome));
      const raioFio = (cfgFio.raio ? Number(cfgFio.raio) : 0.03) * Number(ajFio.escala ?? 1);
      const geo = new T.TubeGeometry(curva, 420, raioFio, 8, false);
      f.malha.geometry.dispose();
      f.malha.geometry = geo;
      f.geo = geo;
      f.curva = curva;
      f.total = geo.index.count;
      geo.setDrawRange(0, f.progresso >= 1 ? f.total : Math.floor(f.total * f.progresso));
    }
  };

  const alturaDaSuperficie = (indice: any, x: any, z: any, ignorar: any = null, seqMax: any = Infinity) => {
    const g = secoes[indice];
    if (!g) return PISO;
    let topo = PISO;
    for (const filho of g.children) {
      if (filho.userData.particulas || filho.userData.cozido) continue;
      if ((filho.userData.seq || 0) > seqMax) continue;
      // ignorar era recebido e nunca aplicado: o próprio ingrediente entrava como apoio
      // de si mesmo (peça pousava na altura do próprio topo e ficava no ar)
      if (ignorar && filho.userData.nome === ignorar) continue;
      // fio (catupiry) é tubo ao longo de uma curva: apoio é o ponto mais próximo do caminho
      if (filho.userData.fioPontos) {
        const grossura = Number(filho.userData.fioRaio ?? 0.02);
        const alcance = grossura * 1.6;
        const dy = filho.position.y || 0;
        for (const ponto of filho.userData.fioPontos as { x: number; y: number; z: number }[]) {
          const fx = x - ponto.x;
          const fz = z - ponto.z;
          if (fx * fx + fz * fz <= alcance * alcance) {
            topo = Math.max(topo, ponto.y + grossura + dy);
            break;
          }
        }
        continue;
      }
      const raio = filho.userData.raio || 0.05;
      const dx = x - filho.position.x;
      const dz = z - filho.position.z;
      // só conta como apoio quando o ponto cai DENTRO da peça (90% do raio): raspar a
      // beirada da rodela levantava o fio sem contato suficiente para sustentá-lo
      if (dx * dx + dz * dz <= raio * raio * 0.81) {
        const altura = filho.userData.topoCorpo != null && filho.position.y < 0.32
          ? filho.position.y + filho.userData.topoCorpo
          : (filho.userData.alvoTopo != null ? filho.userData.alvoTopo : PISO + (filho.userData.topo || 0.03));
        topo = Math.max(topo, altura);
      }
    }
    // fio (catupiry) não entra em `secoes`: é tubo no grupo geral. Só a parte já
    // despejada sustenta — senão o desfiado pousaria em cima de um fio que ainda não existe.
    for (const fio of fios) {
      if (fio.indice !== indice) continue;
      const malha = fio.malha;
      if (ignorar && malha.userData.nome === ignorar) continue;
      const pontos = malha.userData.fioPontos as { x: number; y: number; z: number }[] | undefined;
      if (!pontos?.length) continue;
      const grossura = Number(malha.userData.fioRaio ?? 0.02);
      const alcance = grossura * 1.6;
      const limite = Math.max(1, Math.floor(pontos.length * Math.min(1, fio.progresso)));
      for (let k = 0; k < limite; k += 1) {
        const ponto = pontos[k]!;
        const fx = x - ponto.x;
        const fz = z - ponto.z;
        if (fx * fx + fz * fz <= alcance * alcance) {
          topo = Math.max(topo, ponto.y + grossura);
          break;
        }
      }
    }
    return topo;
  };

  const mao = null; // mão do emissor removida: ficava feia no palco

  const CELULA = 0.055;

  const chaveCel = (x: any, z: any) => `${Math.round(x / CELULA)}|${Math.round(z / CELULA)}`;

  const montesDe = (indice: any, nome: any) => {
    const g = secoes[indice];
    if (!g) return null;
    g.userData.montes = g.userData.montes || {};
    if (!g.userData.montes[nome]) {
      g.userData.montes[nome] = { base: 0 };
    }
    return g.userData.montes[nome];
  };

  // mesma conta nos dois lados (emissor e checagem de alvo): se divergirem, o emissor
  // considera a porção incompleta e reinicia o despejo a cada atualização da cena
  const porPecaDe = (nome: any) => {
    const conf = particulaDe(String(nome));
    return Math.min(240, Math.max(1, Number(ajusteDe(String(nome)).porcao ?? conf.porPeca ?? 1)));
  };

const iniciarEmissor = (indice: any, nome: any, total: any) => {
    const g = secoes[indice];
    if (!g || !g.userData.particulas || !g.userData.particulas[nome]) return;
    const inst = g.userData.particulas[nome];
    const conf = particulaDe(String(nome));
    // params.porcao é "peças por porção" (flocos por peça no desfiado); o teto evita
    // que um valor antigo em 200+ transforme a porção numa enxurrada
    const porPeca = porPecaDe(nome);
    const quantos = Math.min(inst.instanceMatrix.count, Math.round(total * (porPeca || 1) * PERFIL.fios));
    if (!quantos) return;
    const jaPostas = inst.userData.emitidas || 0;
    if (quantos <= jaPostas) return;
    // o ritmo de despejo conta a partir do que ja saiu: sem isso a 2a porcao so comeca
    // quando a fracao criados/total alcanca o que ja estava na cena (640/800 = 1,76 s)
    const lote = Math.max(1, quantos - jaPostas);
    // ritmo curto: uma porção de desfiado tem centenas de fios e não pode segurar a cena
    const ritmo = Math.min(1.4, Math.max(0.5, lote * 0.0035));
    const rodando = emissores.find((e: any) => e.indice === indice && e.nome === nome);
    if (rodando) {
      // qualquer outra porção na cena reexecuta este laço: sem esta guarda o traço
      // dos desfiados recomeçava a cada ingrediente adicionado
      if (quantos <= (rodando.total || 0)) return;
      // porção nova entra no mesmo despejo: só cresce o alvo, sem zerar o relógio
      // (zerar reiniciava a animação e somava segundos a cada ingrediente adicionado)
      rodando.total = quantos;
      return;
    }
    // mesma forma para toda porção desta seção: sem forma fixa o caminho era sorteado a
    // cada emissor e a porção nova caía num padrão diferente da anterior
    const caminho = caminhoFio(T, estado.partes, indice, [], null, formaDoFio(g, 0));
    const estadoEmissor: any = {
      indice,
      nome,
      seq: g.userData.seq || 0,
      inst,
      mao: null,
      total: quantos,
      inicio: jaPostas,
      criados: jaPostas,
      t: 0,
      duracao: ritmo,
      caminho: caminho.length >= 2 ? caminho : [{ x: 0, z: 0 }],
      // herda os flocos das porções anteriores: com lista nova a cada porção, os antigos
      // saíam do rastreamento e ficavam parados no ar para sempre (55 de 1654)
      vivas: Array.isArray(inst.userData.vivas) ? inst.userData.vivas.slice() : [],
    };
    if (!g.userData.camadas) g.userData.camadas = {};
    if (!g.userData.camadas[nome]) {
      const baseFios = alturaDaSuperficie(indice, 0, 0, null, g.userData.seq || 0);
      const porcoesFios = montesDe(indice, nome);
      const fracao = porcoesFios && porcoesFios.base ? Math.max(1, quantos / porcoesFios.base) : 1;
      const picoFios = Math.min(0.012, 0.004 * Math.sqrt(fracao));
      g.userData.camadas[nome] = { base: baseFios, pico: picoFios, topo: baseFios + picoFios };
    }
    emissores.push(estadoEmissor);
  };

  const temTextura = (obj: any) => {
    let achou = false;
    obj.traverse((o: any) => {
      if (o.isMesh && o.material && o.material.map) achou = true;
    });
    return achou;
  };

  const cozinharSecao = (i: any) => {
    const g = secoes[i];
    if (!g || !T) return;
    // o fio de catupiry NAO e re-roteado aqui: ele foi desenhado uma vez e fica onde
    // esta. Re-rotear a cada assentamento fazia a serpentina mudar de forma toda vez que
    // outro ingrediente pousava em cima
    const anterior = g.userData.cozido;
    if (anterior) {
      g.remove(anterior);
      anterior.traverse((o: any) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      g.userData.cozido = null;
    }
    const inv = new T.Matrix4().copy(grupo.matrixWorld).invert();
    const m = new T.Matrix4();
    const v = new T.Vector3();
    const normalMatriz = new T.Matrix3();
    // um balde por MATERIAL: peca assentada some da cena e a secao vira 1 draw call
    // por ingrediente em vez de 1 por peca (era o que estourava a cena cheia)
    g.updateMatrixWorld(true);
    const baldes = new Map();
    let algum = false;
    let pecasFundidas = 0;
    for (const filho of g.children) {
      if (!filho.isMesh && !filho.isGroup) continue;
      if (filho.userData.fio || filho.userData.cozido) continue;
      // peça com material em ARRAY (tomate: lateral + face com foto) não entra na fusão:
      // o balde é por material único, então ela era escondida e não era redesenhada —
      // o tomate "desaparecia" e sobrava só a mancha de contato no lugar
      let arrayMaterial = false;
      filho.traverse((o: any) => { if (o.isMesh && Array.isArray(o.material)) arrayMaterial = true; });
      if (!filho.userData.estatico || arrayMaterial) {
        filho.visible = true;
        continue;
      }
      filho.visible = false;
      algum = true;
      pecasFundidas += 1;
      filho.updateWorldMatrix(true, true);
      filho.traverse((o: any) => {
        if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
        let balde = baldes.get(o.material);
        if (!balde) {
          balde = { posicoes: [], normais: [], uvs: [] };
          baldes.set(o.material, balde);
        }
        m.multiplyMatrices(inv, o.matrixWorld);
        normalMatriz.getNormalMatrix(m);
        const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const pos = geo.attributes.position;
        const nor = geo.attributes.normal;
        const uv = geo.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
          v.fromBufferAttribute(pos, k).applyMatrix4(m);
          balde.posicoes.push(v.x, v.y, v.z);
          if (nor) {
            v.fromBufferAttribute(nor, k).applyMatrix3(normalMatriz).normalize();
            balde.normais.push(v.x, v.y, v.z);
          } else {
            balde.normais.push(0, 1, 0);
          }
          if (uv) balde.uvs.push(uv.getX(k), uv.getY(k));
        }
        if (geo !== o.geometry) geo.dispose();
      });
    }
    if (!algum || !baldes.size) return;
    const grupoCozido = new T.Group();
    grupoCozido.userData.cozido = true;
    grupoCozido.userData.pecas = pecasFundidas;
    for (const [material, balde] of baldes) {
      if (!balde.posicoes.length) continue;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(balde.posicoes as any, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(balde.normais as any, 3));
      if (balde.uvs.length) geo.setAttribute('uv', new T.Float32BufferAttribute(balde.uvs as any, 2));
      const malha = new T.Mesh(geo, material);
      malha.castShadow = true;
      malha.receiveShadow = true;
      grupoCozido.add(malha);
    }
    if (!grupoCozido.children.length) return;
    g.add(grupoCozido);
    g.userData.cozido = grupoCozido;
  };

  const garantirSecao = (i: any) => {
    if (!secoes[i]) {
      const g = new T.Group();
      g.userData.ocupados = [];
      grupo.add(g);
      secoes[i] = g;
    }
    return secoes[i];
  };

  const limparSecoes = () => {
    for (const g of (secoes as any[])) {
      if (!g) continue;
      g.traverse((obj: any) => {
        if (obj.isMesh && obj.geometry && !obj.geometry.userData.cacheada) obj.geometry.dispose();
      });
      grupo.remove(g);
    }
    secoes.length = 0;
    quedas.length = 0;
    if (mundo) {
      for (const corpo of corpos.values()) mundo.removeBody(corpo);
      corpos.clear();
    }
    for (const f of (fios as any[])) {
      grupo.remove(f.malha);
      grupo.remove(f.bico);
      f.malha.geometry.dispose();
      f.malha.material.dispose();
      f.bico.geometry.dispose();
      f.bico.material.dispose();
    }
    fios.length = 0;
  };

  const desenharCortes = () => {
    cortes.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
    cortes.clear();
    if (estado.partes < 2) return;
    const material = new T.MeshStandardMaterial({ color: '#7a3a20', emissive: '#4a1d0c', emissiveIntensity: 0.35, roughness: 0.9 });
    for (let i = 0; i < estado.partes; i++) {
      const ang = anguloDe(estado.partes, i);
      const raio = new T.Mesh(new T.BoxGeometry(0.96, 0.014, 0.032), material);
      raio.position.set(Math.cos(ang) * 0.48, 0.107, Math.sin(ang) * 0.48);
      raio.rotation.y = -ang;
      cortes.add(raio);
    }
  };

  const aplicarDestaque = () => {
    const i = estado.destaque;
    if (estado.partes < 2 || i < 0) {
      aroDestaque.visible = false;
      return;
    }
    const passo = (Math.PI * 2) / estado.partes;
    const a0 = anguloDe(estado.partes, i);
    const arco = passo * 0.94;
    const geo = new T.TorusGeometry(1.02, 0.03, 8, 44, arco);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(-arco - a0);
    aroDestaque.geometry.dispose();
    aroDestaque.geometry = geo;
    aroDestaque.rotation.set(0, 0, 0);
    aroDestaque.visible = true;
  };

  const aplicarBorda = () => {
    const recheada = estado.bordaId !== 'tradicional';
    // o corte (xray) existe só enquanto se escolhe o recheio: fora do passo da borda a
    // borda aparece inteira e o recheio some
    const cortar = recheada && estado.mostrarRecheio !== false;
    bordaMalha.visible = cortar;
    tampasBorda.visible = cortar;
    bordaInterna.visible = false;
    bordaCheia.visible = !cortar;
    recheioBorda.visible = cortar;
    if (!recheada) return;
    recheioBorda.material.color.set(RECHEIOS[estado.bordaId] || RECHEIOS.catupiry);
    for (const mat of recheioTampas) mat.color.set(RECHEIOS[estado.bordaId] || RECHEIOS.catupiry);
  };

  const caixaSolida = new T.Box3();

  const reassentarPecas = (indice: any) => {
    contagem.reassentamentos += 1;
    // rede de segurança SÓ para peça órfã: no ar e sem nada logo abaixo. A rodela em
    // fileira tem apoio na vizinha e NÃO pode ser tocada — mexer nela desmanchava a
    // pilha, e a rodela "se ajustava" (e às vezes sumia) a cada porção nova
    // a rede fica DESLIGADA: mexer em peça já assentada é o "ajuste instantâneo para outra
    // posição" que o Leo vê. Peça no ar é corrigida no momento da criação (apoio), não
    // depois de pousar
    if (false) {
      const g = secoes[indice];
      if (g) {
        const solidas = g.children.filter((c: any) => c.userData.nome && !c.userData.particulas && !c.userData.fio && !c.userData.cozido && c.userData.estatico);
        for (const c of solidas) {
          caixaSolida.setFromObject(c);
          const base = caixaSolida.min.y;
          if (base <= PISO + 0.045) continue; // colada no piso: nada a corrigir
          const raio = (c.userData.raio || 0.05) * 1.2;
          const apoiada = solidas.some((o: any) => {
            if (o === c) return false;
            const dx = o.position.x - c.position.x;
            const dz = o.position.z - c.position.z;
            if (dx * dx + dz * dz > raio * raio) return false;
            const topo = o.position.y + (o.userData.topoCorpo ?? 0.01);
            return topo >= base - 0.02;
          });
          if (apoiada) continue;
          const propria = tipoDo(c.userData.nome) === 'espalhado' ? c.userData.nome : null;
          const alvo = Math.max(PISO, alturaDaSuperficie(indice, c.position.x, c.position.z, propria, (c.userData.seq || 0) - 0.5));
          const centro = alvo - (c.userData.baseCorpo ?? 0);
          const corpo = corpos.get(c);
          const de = c.position.y;
          const para = centro - (c.userData.centroLocal ? c.userData.centroLocal.y : 0);
          if (Math.abs(para - de) < 0.045) continue; // menos de 4,5 cm: ignora
          contagem.ajustesSolidos = (contagem.ajustesSolidos || 0) + 1;
          // 15 passos de 30 ms (~0,45 s): tem de parecer assentamento, não salto
          let passo = 0;
          const descer = () => {
            passo += 1;
            const y = de + (para - de) * (passo / 15);
            c.position.y = y;
            if (corpo) corpo.position.y = y + (c.userData.centroLocal ? c.userData.centroLocal.y : 0);
            if (passo < 15) setTimeout(descer, 30);
            else c.userData.pisoCorpo = centro;
          };
          setTimeout(descer, 60);
        }
      }
    }

    const g = secoes[indice];
    if (!g) return;
    const pecas = g.children.filter(
      (c: any) => c.userData.nome && c.userData.estatico && !c.userData.cozido && !c.userData.particulas,
    );
    // só sai se não houver nem peça nem partícula: com só desfiado na seção (sem
    // rodela nenhuma) o return aqui pulava a descida dos flocos e 60 deles ficavam no ar
    if (!pecas.length && !Object.keys(g.userData.particulas || {}).length) return;
    // altura da massa/queijo: piso de tudo
    // o piso é a massa/queijo. Cada peça acha o próprio apoio pelos vizinhos logo abaixo:
    // usar o topo da camada de outro ingrediente como piso global fazia o ralado flutuar
    // onde não havia rodela embaixo dele
    const base = PISO;
    // o relevo mudou (peça que assentou, porção nova): o ralado já pousado recalcula o
    // próprio apoio e a matriz aqui mesmo, porque depois de pousar o emissor sai da
    // lista e ninguém mais tocaria nessas instâncias — elas ficavam na altura da pilha antiga
    if (g.userData.particulas) {
      for (const chave of Object.keys(g.userData.particulas)) {
        const inst = g.userData.particulas[chave];
        const vivas = inst.userData.vivas;
        if (!vivas || !vivas.length) continue;
        let escreveu = false;
        for (const part of vivas) {
          const superficie = alturaDaSuperficie(indice, part.x, part.z, chave, Infinity);
          const alvoNovo = superficie + 0.0005 + rnd() * 0.0015;
          // só DESCE: floco pousado nunca sobe. Antes, cada rodela nova posta embaixo
          // levantava o alvo e o desfiado subia junto (rodela → desfiado → rodela → sobe)
          if (alvoNovo < part.alvo - 0.012) part.alvo = alvoNovo;
          // acima do apoio: desce em passos curtos (nunca teleporta, senão o fio "pipoca");
          // o laço do emissor já saiu, então quem move o fio aqui é esta passada
          // floco órfão não teleporta: desce rápido, proporcional à distância. Antes ele
          // sumia do alto e reaparecia colado no apoio ("caindo e sumindo no alto")
          if (part.y > part.alvo + 0.25) {
            part.y = Math.max(part.alvo, part.y - Math.max(0.02, (part.y - part.alvo) * 0.35));
            contagem.desceu += 1;
            part.fixo = false;
          }
          if (part.y > part.alvo + 0.002) {
            part.y = Math.max(part.alvo, part.y - 0.002);
            contagem.desceu += 1;
            part.fixo = false;
          } else {
            part.y = part.alvo;
            part.fixo = true;
          }
          _partePos.set(part.x, part.y, part.z);
          _euler.set(part.inclinacao || 0, part.giro, part.inclinacaoZ || 0);
          _parteQuat.setFromEuler(_euler);
          _parteEsc.set(part.esc, part.esc, part.esc);
          _parteMat.compose(_partePos, _parteQuat, _parteEsc);
          inst.setMatrixAt(part.id, _parteMat);
          escreveu = true;
        }
        if (escreveu) inst.instanceMatrix.needsUpdate = true;
      }
    }
    let desceram = 0;
    pecas.sort((a: any, b: any) => a.position.y - b.position.y);
    const cel = new Map<string, any[]>();
    const celula = (x: number, z: number) => `${Math.round(x / 0.3)}|${Math.round(z / 0.3)}`;
    for (const c of pecas) {
      const k = celula(c.position.x, c.position.z);
      const lista = cel.get(k);
      if (lista) lista.push(c);
      else cel.set(k, [c]);
    }
    // quem perdeu o apoio desce: sem isso a peca que estava em cima do ingrediente
    // removido fica flutuando no ar
    for (const c of pecas) {
      const raio = c.userData.raio || 0.05;
      const cx = c.position.x;
      const cz = c.position.z;
      const i0 = Math.round(cx / 0.3);
      const j0 = Math.round(cz / 0.3);
      let apoio = base;
      for (let di = -1; di <= 1; di += 1) {
        for (let dj = -1; dj <= 1; dj += 1) {
          const lista = cel.get(`${i0 + di}|${j0 + dj}`);
          if (!lista) continue;
          for (const o of lista) {
            if (o === c) continue;
            const topoO = o.position.y + (o.userData.topoCorpo || 0);
            if (topoO > c.position.y + 0.002) continue;
            const r = (o.userData.raio || 0.05) + raio * 0.55;
            const dx = cx - o.position.x;
            const dz = cz - o.position.z;
            if (dx * dx + dz * dz <= r * r) apoio = Math.max(apoio, topoO);
          }
        }
      }
      const alvo = apoio - (c.userData.baseCorpo || 0);
      if (c.position.y > alvo + 0.004) {
        c.position.y = alvo;
        desceram += 1;
      }
    }
    g.userData.reassentou = { pecas: pecas.length, desceram };
  };

  const aplicarSecoes = (listas: any, animar: any) => {
    for (let i = 0; i < estado.partes; i++) {
      const g = garantirSecao(i);
      const desejado = contar(listas[i] || []);
      const atual: Record<string, number> = {};
      const malhasPorNome: Record<string, any[]> = {};
      g.children.slice().forEach((filho: any) => {
        if (filho.userData.particulas || filho.userData.cozido) return;
        const nome = filho.userData.nome;
        atual[nome] = (atual[nome] || 0) + 1;
        (malhasPorNome[nome] = malhasPorNome[nome] || []).push(filho);
      });
      let removeuAlgo = false;
      for (const nome of Object.keys(atual)) {
        const excesso = atual[nome] - (desejado[nome] || 0);
        for (let k = 0; k < excesso; k++) {
          const alvo = malhasPorNome[nome].pop();
          g.remove(alvo);
          g.userData.ocupados = g.userData.ocupados.filter((p: any) => p.mesh !== alvo);
          const corpo = corpos.get(alvo);
          if (corpo && mundo) mundo.removeBody(corpo);
          corpos.delete(alvo);
          if (alvo.geometry && !alvo.geometry.userData.cacheada) alvo.geometry.dispose();
          sujas.add(i);
          removeuAlgo = true;
        }
      }
      if (removeuAlgo) reassentarPecas(i);
      if (g.userData.particulas) {
        for (const nome of Object.keys(g.userData.particulas)) {
          const inst = g.userData.particulas[nome];
          const alvoInst = desejado[nome] ? Math.min(inst.instanceMatrix.count, desejado[nome] * porPecaDe(nome)) : 0;
          // porcao removida (ou reduzida) zera a contagem emitida: sem isso o emissor
          // compara o alvo com o que ja saiu e conclui que nao falta nada, e a porcao
          // recolocada nunca reaparece
          const emAtivo = emissores.find((e: any) => e.indice === i && e.nome === nome);
          if (!desejado[nome]) {
            // ingrediente saiu de vez: nada para preservar, a camada tambem vai embora
            inst.count = 0;
            inst.userData.emitidas = 0;
            inst.userData.vivas = [];
            for (let e = emissores.length - 1; e >= 0; e--) {
              if (emissores[e].indice === i && emissores[e].nome === nome) emissores.splice(e, 1);
            }
            if (g.userData.camadas) delete g.userData.camadas[nome];
            if (g.userData.montes) delete g.userData.montes[nome];
          } else if ((inst.userData.emitidas || 0) > alvoInst) {
            // porcao reduzida: apaga SO os fios da ultima porcao. Reemitir o resto
            // recalcularia o pouso na superficie atual e o desfiado antigo subiria
            // por cima de um ingrediente que entrou depois dele
            inst.count = alvoInst;
            inst.userData.emitidas = alvoInst;
            // filtra por id (indice global do fio), nao por tamanho da lista: a lista
            // "vivas" pode conter so o lote novo, cujos ids comecam em 160
            if (Array.isArray(inst.userData.vivas)) {
              inst.userData.vivas = inst.userData.vivas.filter((p: any) => p.id < alvoInst);
            }
            if (emAtivo) {
              emAtivo.total = Math.min(emAtivo.total, alvoInst);
              emAtivo.criados = Math.min(emAtivo.criados, alvoInst);
              emAtivo.inicio = Math.min(emAtivo.inicio || 0, emAtivo.criados);
              emAtivo.vivas = emAtivo.vivas.filter((p: any) => p.id < alvoInst);
            }
            const camada = g.userData.camadas && g.userData.camadas[nome];
            if (camada) {
              const baseInst = (g.userData.montes && g.userData.montes[nome] && g.userData.montes[nome].base) || alvoInst;
              camada.pico = Math.min(0.03, 0.012 * Math.max(1, alvoInst / baseInst));
              camada.topo = camada.base + camada.pico;
            }
          }
        }
      }
      // a fusao NAO roda aqui: com muitas porcoes ela custa O(pecas) no clique.
      // marca a secao e o laco funde quando a cena assentar
      sujas.add(i);
      let fioDesejado = 0;
      for (const nome of Object.keys(desejado)) if (ehFio(nome)) fioDesejado += desejado[nome];
      let fioAtual = 0;
      for (const f of (fios as any[])) if (f.indice === i) fioAtual += 1;
      while (fioAtual > fioDesejado) {
        removerFio(i);
        fioAtual -= 1;
      }
      // espalhados e fios primeiro, pecas solidas depois: o queijo e servido antes da rodela,
      // entao a rodela pousa EM CIMA da camada de queijo (ordem fixa, nao a do cardapio)
      const ordem = Object.keys(desejado).sort((a, b) => {
        const classe = (n: any) => {
          const t = tipoDo(n);
          return t === 'desfiado' || t === 'fio' || t === 'fios' ? 0 : 1;
        };
        return classe(a) - classe(b);
      });

      for (const nome of ordem) {
        // sem classe no servidor o ingrediente não é despejado (nem sólido, nem fio)
        if (!tipoDo(nome)) {
          console.warn('[pz] ingrediente sem classe no servidor', nome);
          continue;
        }
        if (tipoDo(nome) === 'desfiado') {
          garantirParticulas(i, nome, desejado[nome]);
          iniciarEmissor(i, nome, desejado[nome]);
          continue;
        }
        if (ehFio(nome)) {
          let tem = 0;
          for (const f of (fios as any[])) if (f.indice === i) tem += 1;
          for (let k = tem; k < desejado[nome]; k++) criarFio(nome, i, g, k);
          continue;
        }
        const falta = (desejado as Record<string, number>)[nome]! - (atual[nome] || 0);
        if (falta > 0) {
          const raioPeca = medidaDe(nome).raio || (RAIO_PECA as Record<string, number>)[nome] || 0.045;
          const tipo = tipoDo(nome);
          const chapada = tipo === 'rodela';
          const fatiasSecao = Math.max(1, Math.round(8 / estado.partes));
          const jaNaSecao = g.children.filter((c: any) => !c.userData.particulas && !c.userData.cozido).length;
          // a coluna avança pelo que JA existe de OUTROS ingredientes; as pecas deste
          // ingrediente sao indexadas por k (1a porcao = primeiro degrau, 2a = o seguinte)
          // só RODELA de outro ingrediente ocupa degrau: espalhado, ralado e berinjela
          // não empurram a fileira (era isso que jogava a calabresa para o centro e para
          // fora ao mesmo tempo quando havia manjericão/berinjela na pizza)
          const outrosNaSecao = Math.max(0, g.children.filter((c: any) => c.userData.nome
            && !c.userData.particulas && !c.userData.cozido && !c.userData.fio
            && c.userData.nome !== nome && tipoDo(c.userData.nome) === 'rodela').length);
          // o degrau inicial de cada ingrediente e decidido UMA vez; recalcular a cada
          // porcao faz a coluna pular dois degraus e a peca nova deixa de tocar a anterior
          if (!g.userData.baseIngrediente) g.userData.baseIngrediente = {};
          // a base do ingrediente vale enquanto ele tiver peca na secao. Se todas foram
          // removidas, recalcula: senao a proxima porcao nasce com o indice antigo (degrau
          // la na frente) e a rodela aparece no centro ou numa camada alta
          const mapa = mapaDoSetor(estado.partes, raioPeca);
          if (chapada && (g.userData.baseIngrediente[nome] == null || (atual[nome] || 0) === 0)) {
            // comeca na BORDA da proxima camada livre, nao continuando o degrau do outro
            // ingrediente: senao a porcao nova nasce no centro da pizza
            g.userData.baseIngrediente[nome] = Math.min(outrosNaSecao, Math.max(0, shingleDoSetor(estado.partes, i, 400, raioPeca, 0).length - 1));
          }
          const baseIdx = chapada ? (g.userData.baseIngrediente[nome] || 0) : 0;
          const alvoPecas = desejado[nome] as number;
          const alvo = chapada
            ? shingleDoSetor(estado.partes, i, alvoPecas + baseIdx, raioPeca, baseIdx)
            : tipo === 'espalhado'
              ? espalhadoDoSetor(estado.partes, i, desejado[nome], raioPeca)
              : coroasDoSetor(estado.partes, i, desejado[nome], raioPeca, faseDoNome(nome));
          // posição determinística: cada peça nova assume o próximo ponto do layout.
          // a lista ja nasce deslocada por baseIdx, entao o indice e o da peca, nao o absoluto
          const jaTem = atual[nome] || 0;
          for (let k = jaTem; k < alvoPecas; k += 1) {
            const bruto = chapada ? alvo[baseIdx + k] ?? alvo[k] : alvo[k] ?? alvo[k % alvo.length];
            if (!bruto) break;
            // quando a quantidade passa da capacidade do layout o indice volta ao comeco:
            // sem deslocar, a peca nasce exatamente sobre a anterior (duas pecas no mesmo
            // ponto, mesmo y). gira pelo angulo aureo para empilhar em vez de duplicar.
            const volta = Math.floor(k / alvo.length);
            let px = bruto.x;
            let pz = bruto.z;
            if (volta > 0) {
              // a sobra da porção pousa ao LADO da peça de baixo, deslocada de 65% do raio
              // no sentido tangencial, em fieira: 1ª encosta na 2ª, a 2ª na 3ª. Antes o
              // deslocamento era de 35% e a peça nova caía quase exatamente sobre a velha,
              // lendo como rodela duplicada em cima da outra
              const angBase = Math.atan2(pz, px);
              const sentido = k % 2 ? 1 : -1;
              const deslocaTang = raioPeca * 0.65 * volta * sentido;
              px += Math.cos(angBase + Math.PI / 2) * deslocaTang;
              pz += Math.sin(angBase + Math.PI / 2) * deslocaTang;
            }
            // trava final: nenhuma peça pode nascer fora do arco do seu setor, senão a
            // calabresa da parte 1 aparece na parte 3 quando a pizza é dividida
            {
              const TAU = Math.PI * 2;
              const passoSetor = TAU / estado.partes;
              const raioP = Math.hypot(px, pz);
              const rel = (((Math.atan2(pz, px) + Math.PI / 2) % TAU) + TAU) % TAU;
              const margem = Math.min(passoSetor * 0.42, Math.max(0.02, (raioPeca * 0.8) / Math.max(0.15, raioP)));
              const lo = i * passoSetor + margem;
              const hi = (i + 1) * passoSetor - margem;
              const relTravada = Math.min(Math.max(lo, Math.min(hi, rel)), hi < lo ? (lo + hi) / 2 : hi);
              const angTravado = -Math.PI / 2 + relTravada;
              px = Math.cos(angTravado) * raioP;
              pz = Math.sin(angTravado) * raioP;
            }
            const pt = { x: px, z: pz, giro: bruto.giro, volta: bruto.volta };
            const ponto = {
              x: pt.x,
              z: pt.z,
              escala: 1,
              giro: pt.giro,
              ancorado: chapada,
              camada: chapada ? Math.min(4, pt.volta || 0) : 0,
              apoio: topoDaPilha(g, pt.x, pt.z, raioPeca, chapada ? raioPeca * 1.55 : null),
            };
            const malha = criarTopping(nome, ponto, animar);
            if (!malha) continue;
            g.add(malha);
            g.userData.seq = (g.userData.seq || 0) + 1;
            malha.userData.seq = g.userData.seq;
            g.userData.ocupados.push({ x: ponto.x, z: ponto.z, mesh: malha });
          }
          if (chapada) g.userData.camada = Math.min(3, (g.userData.camada || 0) + 1);
        }
      }
    }
    for (let i = secoes.length - 1; i >= estado.partes; i--) {
      const g = secoes[i];
      if (!g) continue;
      g.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
      grupo.remove(g);
      secoes.splice(i, 1);
    }
  };

  const ajustar = () => {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    renderer.setSize(largura, altura, false);
    const aspecto = largura / altura;
    camera.aspect = aspecto;
    const recuo = aspecto < 1.05 ? 1 + (1.05 - aspecto) * 1.4 : 1;
    camera.position.set(0, 3.62 * recuo, 4.05 * recuo);
    camera.lookAt(0, 0.16, 0);
    camera.updateProjectionMatrix();
    sujo = true;
  };

  const redimensionar = new ResizeObserver(ajustar);
  redimensionar.observe(canvas);
  ajustar();

  if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
    window.__studio3d = { renderer, mundo, corpos, cena, camera };
  }

  const aquecerShaders = () => {
    const quente = new T.Group();
    quente.position.set(0, -80, 0);
    const geo = new T.BoxGeometry(0.001, 0.001, 0.001);
    const comCor = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0.02 });
    const liso = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72, metalness: 0.02 });
    quente.add(new T.Mesh(geo, comCor));
    quente.add(new T.Mesh(geo, liso));
    quente.add(new T.InstancedMesh(geo, liso, 1));
    cena.add(quente);
    const limpar = () => {
      cena.remove(quente);
      geo.dispose();
      comCor.dispose();
      liso.dispose();
    };
    if (typeof renderer.compileAsync === 'function') {
      renderer.compileAsync(cena, camera).then(limpar).catch(() => {
        renderer.compile(cena, camera);
        limpar();
      });
    } else {
      renderer.compile(cena, camera);
      limpar();
    }
  };
  aquecerShaders();

  let arrastando = false;
  let ultimoX = 0;
  let giro = 0;
  let giroAuto = 0;
  let autoGirar = opcoes.girar === true;

  canvas.addEventListener('pointerdown', (e: any) => {
    arrastando = true;
    sujo = true;
    ultimoX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e: any) => {
    if (!arrastando) return;
    sujo = true;
    giro += (e.clientX - ultimoX) * 0.008;
    ultimoX = e.clientX;
  });
  const soltar = () => {
    arrastando = false;
    sujo = true;
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('pointerleave', soltar);

  const relogio = new T.Clock();

  let quadros = 0;
  let _ultQ = 0;
  let reancorarAte = 0;
  let proximaChecagem = 0;

  // seções que ainda têm fio acima do apoio: o loop processa até esvaziar, senão o fio
  // congela no ar quando a janela de acompanhamento expira
  const pendentesDeApoio: number[] = [];
  const tentativasDeApoio: Record<number, number> = {};
  const contagem: any = ((window as any).__pzContagem = (window as any).__pzContagem || { reassentamentos: 0, revisoesPendentes: 0, desceu: 0 });
  const fiosPerdidos = (indice: number) => {
  const g = secoes[indice];
  if (!g || !g.userData.particulas) return 0;
  let total = 0;
  for (const chave of Object.keys(g.userData.particulas)) {
    const vivas = g.userData.particulas[chave].userData.vivas;
    if (!vivas) continue;
    for (const part of vivas) {
      const superficie = alturaDaSuperficie(indice, part.x, part.z, chave, Infinity);
      if (part.y - superficie > 0.008) total += 1;
    }
  }
  return total;
  };

  const solidosPerdidos = (indice: number) => {
    const g = secoes[indice];
    if (!g) return 0;
    let n = 0;
    const caixa = new T.Box3();
    const solidas = g.children.filter((c: any) => c.userData.nome && !c.userData.particulas && !c.userData.fio && !c.userData.cozido && c.userData.estatico);
    for (const c of solidas) {
      caixa.setFromObject(c);
      if (caixa.min.y <= PISO + 0.04) continue;
      const raio = (c.userData.raio || 0.05) * 1.2;
      const apoiada = solidas.some((o: any) => {
        if (o === c) return false;
        const dx = o.position.x - c.position.x;
        const dz = o.position.z - c.position.z;
        if (dx * dx + dz * dz > raio * raio) return false;
        return o.position.y + (o.userData.topoCorpo ?? 0.01) >= caixa.min.y - 0.02;
      });
      if (!apoiada) n += 1;
    }
    return n;
  };

  const fiosForaDeApoio = (indice: number) => {
  const g = secoes[indice];
  if (!g || !g.userData.particulas) return 0;
  let total = 0;
  for (const chave of Object.keys(g.userData.particulas)) {
    const vivas = g.userData.particulas[chave].userData.vivas;
    if (!vivas) continue;
    for (const part of vivas) if (part.y > part.alvo + 0.002) total += 1;
  }
  return total;
  };

  // varredura sem alocar array por quadro (era [...corpos.values()] a cada frame)
  const algumCorpoSolto = () => {
    for (const corpo of corpos.values()) if (!(corpo as any)._estatico) return true;
    return false;
  };

  let _msLoop = 0;
  const animarLoop = () => {
    // aba escondida não precisa desenhar: economiza bateria e aquece menos
    if (typeof document !== 'undefined' && document.hidden) return;
    const _t0 = performance.now();
    const dt = Math.min(relogio.getDelta(), 0.05);
    // render on demand: pizza parada, nenhum corpo acordado e nenhum emissor ativo
    // significa nada mudou — desenhar de novo e so gastar bateria e esquentar o aparelho
  const temTrabalho = arrastando || autoGirar || emissores.length > 0
      || fios.some((f: any) => f.progresso < 1)
      || aroDestaque.visible
      || sujas.size > 0
      || algumCorpoSolto()
      || relogio.elapsedTime < reancorarAte
      || pendentesDeApoio.length > 0;
    if (!temTrabalho && !sujo) {
      // a cena ia dormir: antes disso, procura fio que ficou no ar. O vigia de dentro do
      // loop nunca rodava porque o loop parava antes — esta é a última chance de ver
      secoes.forEach((g: any, indice: number) => {
        if (g && (fiosPerdidos(indice) > 0 || solidosPerdidos(indice) > 0) && !pendentesDeApoio.includes(indice)) {
          pendentesDeApoio.push(indice);
        }
      });
      if (!pendentesDeApoio.length) {
        // a pilha pode assentar DEPOIS deste quadro: agenda uma re-checagem única
        if (relogio.elapsedTime > proximaChecagem) {
          proximaChecagem = relogio.elapsedTime + 0.4;
          setTimeout(() => {
            secoes.forEach((g: any, indice: number) => {
              if (g && (fiosPerdidos(indice) > 0 || solidosPerdidos(indice) > 0) && !pendentesDeApoio.includes(indice)) {
                pendentesDeApoio.push(indice);
                sujo = true;
              }
            });
          }, 420);
        }
        return;
      }
    }
    sujo = false;
    quadros += 1;
    if (relogio.elapsedTime > 20 && !arrastando && autoGirar) giroAuto += dt * 0.1;
    if (relogio.elapsedTime < reancorarAte && quadros % 30 === 0) {
      secoes.forEach((g: any, indice: number) => {
        if (g && g.userData.particulas && Object.keys(g.userData.particulas).length) reassentarPecas(indice);
      });
    }
    (window as any).__pzPendentes = pendentesDeApoio.length;
    if (pendentesDeApoio.length && quadros % 6 === 0) {
      contagem.revisoesPendentes += 1;
      for (let i = pendentesDeApoio.length - 1; i >= 0; i -= 1) {
        const indice = pendentesDeApoio[i]!;
        reassentarPecas(indice);
        tentativasDeApoio[indice] = (tentativasDeApoio[indice] || 0) + 1;
        const resolvido = fiosPerdidos(indice) === 0 && solidosPerdidos(indice) === 0;
        // teto de tentativas: peça que nunca "resolve" (rodela empilhada em fileira, que
        // está apoiada mas fora do raio de teste) mantinha a cena renderizando para sempre
        if (resolvido || tentativasDeApoio[indice] > 60) {
          pendentesDeApoio.splice(i, 1);
          delete tentativasDeApoio[indice];
        }
      }
    }
    // vigia: fio que ficou no ar porque a pilha embaixo desceu ganha nova chance
    if (relogio.elapsedTime < reancorarAte && quadros % 60 === 0) {
      secoes.forEach((g: any, indice: number) => {
        if (!g || !g.userData.particulas) return;
        for (const chave of Object.keys(g.userData.particulas)) {
          const vivas = g.userData.particulas[chave].userData.vivas;
          if (!vivas || !vivas.length) continue;
          const perdido = vivas.some((part: any) => part.y - alturaDaSuperficie(indice, part.x, part.z, chave, Infinity) > 0.008);
          if (perdido) {
            // registra a seção na fila: a fila mantém o loop vivo até o fio encostar,
            // independente da janela de tempo
            if (!pendentesDeApoio.includes(indice)) pendentesDeApoio.push(indice);
            reassentarPecas(indice);
          }
        }
      });
    }
    grupo.rotation.y = giro + giroAuto;

    if (mundo) {
      let acordado = 0;
      for (const corpo of corpos.values()) if (!corpo._dormiu && corpo.sleepState !== 2) acordado += 1;
      if (acordado) {
        const passos = Math.min(5, Math.max(1, Math.ceil(dt * 60) + 1));
        mundo.step(1 / 60, dt, passos);
        for (const [malha, corpo] of corpos) {
          if (corpo._estatico) continue;
          // trava dura: nada sai do disco, mesmo se o solver deixar passar
          const rxz = Math.hypot(corpo.position.x, corpo.position.z);
          if (rxz > 0.78) {
            const k = 0.78 / rxz;
            corpo.position.x *= k;
            corpo.position.z *= k;
            const vr = (corpo.velocity.x * corpo.position.x + corpo.velocity.z * corpo.position.z) / (0.78 * 0.78);
            if (vr > 0) {
              corpo.velocity.x -= vr * corpo.position.x;
              corpo.velocity.z -= vr * corpo.position.z;
            }
          }
          const v = corpo.velocity;
          const mod = Math.hypot(v.x, v.y, v.z);
          if (mod > 3.5) v.scale(3.5 / mod, v);
          const w = corpo.angularVelocity;
          const modW = Math.hypot(w.x, w.y, w.z);
          if (modW > 1.6) w.scale(1.6 / modW, w);
        }
      }
      if (sujas.size && (acordado === 0 || relogio.elapsedTime - ultimaCozinha > 1.2)) {
        for (const i of sujas as Set<number>) {
          const caindo = secoes[i] && secoes[i].children.some((m: any) => (m.userData.quedaY || 0) > 0);
          if (!caindo) cozinharSecao(i);
        }
        sujas.clear();
        ultimaCozinha = relogio.elapsedTime;
      }
      for (const [malha, corpo] of corpos) {
        if (corpo._dormiu) continue;
        const centro = malha.userData.centroLocal;
        // eixo travado: só cai, não desliza nem gira
        if (malha.userData.travaXZ) {
          const t = malha.userData.travaXZ;
          corpo.position.x = t.x;
          corpo.position.z = t.z;
          // velocidade lateral zerada junto com a posicao: peca presa contra outra
          // ficava recebendo impulso do solver todo quadro e nunca "parava" (fisica eterna)
          corpo.velocity.x = 0;
          corpo.velocity.z = 0;
        }
        // topo real e continuo: usado por quem precisa pousar em cima desta peca
        const piso = malha.userData.pisoCorpo;
        if (piso != null && corpo.position.y < piso) {
          corpo.position.y = piso;
          if (corpo.velocity.y < 0) corpo.velocity.y = 0;
        }
        const q = corpo.quaternion;
        if (centro) {
          _centro.set(centro.x, centro.y, centro.z).applyQuaternion(q);
          malha.position.set(
            corpo.position.x - _centro.x,
            corpo.position.y - _centro.y,
            corpo.position.z - _centro.z
          );
        } else {
          malha.position.copy(corpo.position);
        }
        // a rodela pode inclinar para apoiar na borda da de baixo, mas nao pode ficar em pe:
        // acima de ~18 graus o corpo e corrigido de volta para a horizontal
        const inclinacao = Math.acos(Math.min(1, Math.max(-1, 1 - 2 * (q.x * q.x + q.z * q.z))));
        if (inclinacao > INCLINACAO_MAX) {
          const fator = INCLINACAO_MAX / inclinacao;
          const corrigida = new C.Quaternion(q.x * fator, q.y, q.z * fator, 1);
          corrigida.normalize();
          corpo.quaternion.copy(corrigida);
          q.copy(corrigida);
          corpo.angularVelocity.scale(0.2, corpo.angularVelocity);
        }
        malha.quaternion.copy(q);

        // assentou: velocidade baixa por tempo suficiente -> vira estatico e sai do solver.
        // Sem isso a fisica roda para sempre com todas as pecas e a cena cheia engasga.
        const vel = Math.hypot(corpo.velocity.x, corpo.velocity.y, corpo.velocity.z);
        const gir = Math.hypot(corpo.angularVelocity.x, corpo.angularVelocity.y, corpo.angularVelocity.z);
        // peca deitada no chao (y == piso) e sem velocidade linear nao tem mais o que fazer:
        // o contato empurra angular e o limite de inclinacao devolve, e esse balanco de
        // +/-1 rad/s nao deixa a peca dormir nunca (era o tremor que aparecia na tela).
        const apoiada = piso != null && Math.abs(corpo.position.y - piso) < 0.0015 && vel < 0.06;
        const quieta = vel < 0.22 && gir < 0.9;
        if (apoiada) corpo._parado = (corpo._parado || 0) + dt * 3;
        else if (quieta) corpo._parado = (corpo._parado || 0) + dt;
        if (apoiada || quieta) {
          if (corpo._parado > 0.32) {
            corpo._estatico = true;
            corpo.velocity.setZero();
            corpo.angularVelocity.setZero();
            corpo.type = C.Body.STATIC;
            corpo.mass = 0;
            corpo.updateMassProperties();
            corpo.sleep();
            malha.userData.estatico = true;
            corpo._retirado = true;
            const idx = secoes.indexOf(malha.parent);
            if (idx >= 0) sujas.add(idx);
          }
        } else {
          corpo._parado = 0;
        }
        corpo._dormiu = corpo._estatico === true;
        if (corpo._retirado) {
          mundo.removeBody(corpo);
          corpos.delete(malha);
        }
      }
    }

    for (const fio of (fios as any[])) {
      if (fio.progresso >= 1) {
        fio.bico.visible = false;
        continue;
      }
      fio.progresso = Math.min(1, fio.progresso + dt * 0.55);
      fio.geo.setDrawRange(0, Math.floor(fio.total * fio.progresso));
      const p = fio.curva.getPointAt(Math.min(0.999, fio.progresso));
      _bicoAlvo.set(p.x, p.y + 0.14, p.z);
      fio.bico.position.lerp(_bicoAlvo, Math.min(1, dt * 12));
    }


    if (aroDestaque.visible) {
      aroDestaque.material.emissiveIntensity = 0.55 + Math.sin(relogio.elapsedTime * 4) * 0.25;
    }

    for (let e = emissores.length - 1; e >= 0; e--) {
      const em = emissores[e];
      em.t += dt;
      const k = Math.min(1, em.t / em.duracao);
      const idxCaminho = Math.min(em.caminho.length - 1, Math.floor(k * (em.caminho.length - 1)));
      const ponto = em.caminho[idxCaminho] || { x: 0, z: 0 };
      const passo = (Math.PI * 2) / estado.partes;
      const inicio = -Math.PI / 2 + em.indice * passo;
      const R = 0.72;
      const monteEm = em.monte || montesDe(em.indice, em.nome);
      if (monteEm && !monteEm.base) monteEm.base = Math.max(1, em.total);
      const porcoesEm = monteEm && monteEm.base ? Math.max(1, em.total / monteEm.base) : 1;
      // altura do monte: parte do que esta embaixo (massa, rodela, fio ja pousado) e sobe
      // alguns milimetros por porcao. Teto baixo = nenhum fio fica pendurado no ar.
      const pico = Math.min(0.012, 0.004 * Math.sqrt(porcoesEm));
      const grupoEm = secoes[em.indice];
      const camadaEm = grupoEm && grupoEm.userData.camadas ? grupoEm.userData.camadas[em.nome] : null;
      if (em.inst.userData.revisar) {
        for (const part of em.vivas) {
          const superficie = alturaDaSuperficie(em.indice, part.x, part.z, em.nome, Infinity);
          part.alvo = superficie + 0.0005 + rnd() * 0.0015;
          if (part.y > part.alvo + 0.002) part.fixo = false;
        }
        em.inst.userData.revisar = false;
      }
      let nesteQuadro = 0;
      // teto por quadro proporcional ao dt: em tela lenta o despejo não pode virar 8 s
      const tetoQuadro = Math.max(12, Math.min(320, Math.ceil(5200 * dt)));
      while (em.criados < em.total && (em.criados - (em.inicio || 0)) / Math.max(1, em.total - (em.inicio || 0)) <= k && nesteQuadro < tetoQuadro) {
        nesteQuadro += 1;
        // espalha por toda a área do setor (não em montes separados)
        const ang = inicio + Math.random() * passo;
        const tamanhoFloco = Number(particulaDe(String(em.nome)).tamanho ?? particulaDe(String(em.nome)).particulaTamanho ?? 0.12);
        const escFloco = 0.55 + Math.random() * 0.95;
        // floco nao pode passar da beirada: desconta meia diagonal do tamanho dele
        const meiaDiagonal = tamanhoFloco * 0.5 * escFloco * 1.05;
        const raio = Math.min(R - meiaDiagonal, R * Math.pow(Math.random(), 0.45));
        const x = Math.cos(ang) * raio;
        const z = Math.sin(ang) * raio;
        // apoio medido nos quatro cantos do floco (nao no centro): com meio lado de
        // amostra, metade do fio ficava pendurada quando encostava numa rodela
        const meioFio = tamanhoFloco * 0.46;
        const giroFio = Math.random() * Math.PI * 2;
        const dxFio = Math.cos(giroFio) * meioFio;
        const dzFio = Math.sin(giroFio) * meioFio;
        const hx1 = alturaDaSuperficie(em.indice, x - dxFio, z - dzFio, em.nome, em.seq);
        const hx2 = alturaDaSuperficie(em.indice, x + dxFio, z + dzFio, em.nome, em.seq);
        const hz1 = alturaDaSuperficie(em.indice, x + dzFio, z - dxFio, em.nome, em.seq);
        const hz2 = alturaDaSuperficie(em.indice, x - dzFio, z + dxFio, em.nome, em.seq);
        // apoio do floco: média dos cantos; se o relevo sob ele varia muito (encosta numa
        // rodela de um lado e no vão do outro), desce para o canto mais baixo — senão o
        // floco fica atravessado no ar, apoiado só na beirada da pilha
        const amostras = [hx1, hx2, hz1, hz2];
        const maisBaixo = Math.min(...amostras);
        const maisAlto = Math.max(...amostras);
        // encosta no alto só quem tem contato de verdade: pelo menos dois cantos no topo.
        // Um canto raspando na rodela não sustenta o fio — ele cai para o vão
        const altos = amostras.filter((a) => maisAlto - a < 0.008);
        const apoio = altos.length >= 2
          ? altos.reduce((s, a) => s + a, 0) / altos.length
          : maisBaixo;
        const inclinaX = Math.max(-0.5, Math.min(0.5, Math.atan2(hz2 - hz1, 2 * meioFio)));
        const inclinaZ = Math.max(-0.5, Math.min(0.5, -Math.atan2(hx2 - hx1, 2 * meioFio)));
        const cel = chaveCel(x, z);
        // flocos empilhados dentro da espessura da camada: a maioria encosta no apoio,
        // alguns sobem — a pilha cresce com as porções sem virar laje nem flutuar
        // flocos ficam na espessura da camada (2 cm de cena no maximo): a maioria encosta
        // no apoio e so alguns sobem — sem isso o fio do topo fica pendurado no ar
        // pilha invisivel: 0,5 a 2,5 mm de folga — mais que isso o fio flutua e a sombra
        // denuncia; menos que isso os fios sobrepostos brigam por z
        const altura = 0.0005 + rnd() * 0.002;
        if (camadaEm && camadaEm.base > apoio) camadaEm.base = apoio;
        em.vivas.push({
          id: em.criados,
          x,
          z,
          apoio,
          y: 2.2 + aleatorio(0, 0.35),
          alvo: apoio + 0.0015 + altura,
          v: aleatorio(0.35, 0.7),
          giro: giroFio,
          inclinacao: inclinaX,
          inclinacaoZ: inclinaZ,
          esc: escFloco,
        });
        em.criados += 1;
      }
      let escreveu = false;
      for (const part of em.vivas) {
        if (part.y > part.alvo) {
          // queda em segundos (não em quadros): em tela lenta 2,2 m levavam 4 s
          part.y = Math.max(part.alvo, part.y - Math.max(0.02, part.v * dt * 26));
          part.fixo = false;
        } else if (part.fixo) {
          continue; // ja pousado: nao reescreve matriz nem reenvia o buffer de instancias
        } else {
          part.fixo = true;
        }
        _partePos.set(part.x, part.y, part.z);
        _euler.set(part.inclinacao || 0, part.giro, part.inclinacaoZ || 0);
        _parteQuat.setFromEuler(_euler);
        _parteEsc.set(part.esc, part.esc, part.esc);
        _parteMat.compose(_partePos, _parteQuat, _parteEsc);
        em.inst.setMatrixAt(part.id, _parteMat);
        escreveu = true;
      }
      // count pelo que existe em vivas: matriz de floco que saiu da lista ficava para
      // sempre na altura de emissão (2,2 m) e aparecia como floco pendurado no céu
      em.inst.count = Math.min(em.criados, em.vivas.length);
      em.inst.userData.emitidas = em.inst.count;
      em.inst.userData.vivas = em.vivas;
      em.inst.userData.pico = pico;
      if (escreveu) em.inst.instanceMatrix.needsUpdate = true;
      const pousadas = em.vivas.every((part: any) => part.y <= part.alvo + 0.0005);
      if (em.criados >= em.total && pousadas) {
        emissores.splice(e, 1);
        // tudo pousou: reassenta as peças e reancora o ralado na superfície final.
        // sem isso o ralado fica na altura em que foi emitido e, quando as torres de
        // rodela assentam, sobra floco pendurado no ar
        reassentarPecas(em.indice);
        reancorarAte = Math.max(reancorarAte, relogio.elapsedTime + 20);
        if (fiosForaDeApoio(em.indice) > 0 && !pendentesDeApoio.includes(em.indice)) pendentesDeApoio.push(em.indice);
      }
    }

    renderer.render(cena, camera);
    _msLoop = _msLoop * 0.9 + (performance.now() - _t0) * 0.1;
  };

  const aplicar = (novo: any, animar = true) => {
    // depois que as peças pousam, reassenta de novo: rede de segurança para peça sólida
    // que parou no ar (só era corrigida quando outra porção era adicionada)
    if (animar) {
      for (const atraso of [1600]) {
        setTimeout(() => {
          secoes.forEach((_, indice) => reassentarPecas(indice));
          sujo = true;
        }, atraso);
      }
    }
    const mudouPartes = novo.partes != null && novo.partes !== estado.partes;
    // mostrarRecheio é prop do passo: tem de entrar no estado e redesenhar a borda,
    // senão o corte fica na tela depois de sair da etapa
    const novoRecheio = novo.mostrarRecheio !== false;
    if (novoRecheio !== estado.mostrarRecheio) {
      estado.mostrarRecheio = novoRecheio;
      aplicarBorda();
    }
    const mudouBorda = novo.bordaId != null && novo.bordaId !== estado.bordaId;
    if (novo.bordaId != null) estado.bordaId = novo.bordaId;
    if (novo.destaque != null) estado.destaque = novo.destaque;
    if (novo.girar != null) autoGirar = novo.girar;
    if (mudouPartes) {
      estado.partes = novo.partes;
      limparSecoes();
      desenharCortes();
      animar = false;
    }
    if (mudouBorda) aplicarBorda();
    if (novo.fatias) estado.fatias = novo.fatias;
    if (novo.secoes) { aplicarSecoes(novo.secoes, animar); receberSombra(); }
    aplicarDestaque();
    sujo = true;
  };

  estado.partes = opcoes.partes || 1;
  desenharCortes();
  aplicarBorda();
  // a cena nasce caindo do alto (como no motor antigo); `animarEntrada: false` desliga
  aplicar({ partes: estado.partes, secoes: opcoes.secoes || [] }, opcoes.animarEntrada !== false);
  aplicarDestaque();
  renderer.setAnimationLoop(animarLoop);

  // auditoria da ficha: mede a malha que a receita gera, sem precisar criar a pizza
  window.__pzAjustar = (nome: string, params: Record<string, any>) => ajustarRender(nome, params);
  window.__pzMedir = (nome: string) => {
    const malha = malhaTopping(T, nome);
    const caixa = new T.Box3().setFromObject(malha);
    const tamanho = new T.Vector3();
    caixa.getSize(tamanho);
    const geos: string[] = [];
    malha.traverse((o: any) => {
      if (o.geometry) geos.push(o.geometry.type);
    });
    return {
      geo: geos[0] ?? 'nenhuma',
      tri: geos.length,
      largura: +tamanho.x.toFixed(4),
      altura: +tamanho.y.toFixed(4),
      profundidade: +tamanho.z.toFixed(4),
    };
  };

  window.__pzDetalhe = () => secoes.map((g: any, i: number) => (g ? g.children.filter((c: any) => c.userData.nome).map((c: any) => ({
    nome: c.userData.nome,
    y: +c.position.y.toFixed(3),
    pouso: +(c.userData.pouso ?? -9).toFixed(3),
    quedaY: +(c.userData.quedaY ?? -9).toFixed(3),
    queda: +(c.userData.queda ?? -9).toFixed(3),
    centro: +(c.userData.centroLocal ? c.userData.centroLocal.y : -9).toFixed(3),
    escala: +c.scale.y.toFixed(3),
    geo: c.geometry ? c.geometry.type : (c.children[0] && c.children[0].geometry ? c.children[0].geometry.type : 'grupo'),
    mapa: (() => {
      let achou = false;
      c.traverse((o: any) => {
        if (!o.isMesh || !o.material) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.some((m: any) => m && m.map)) achou = true;
      });
      return achou;
    })(),
    cor: (() => {
      let hex = '';
      c.traverse((o: any) => {
        if (!o.isMesh || !o.material || hex) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (m && m.color) hex = m.color.getHexString();
      });
      return hex;
    })(),
  })) : []));

  window.__pzVel = () => [...corpos].map(([m, c]: any) => [
    m.userData.nome, +c.position.x.toFixed(2), +c.position.y.toFixed(3), +c.position.z.toFixed(2),
    +c.velocity.y.toFixed(3), +c.mass.toFixed(3), c.sleepState, c.type === 2 ? 'static' : 'dyn', c._parado ? +c._parado.toFixed(2) : 0,
  ]);

  window.__pz = () => secoes.map((g: any) => (g ? g.children.map((c: any) => [c.userData.nome, +c.position.x.toFixed(2), +c.position.y.toFixed(2), +c.position.z.toFixed(2)]) : []));

  window.__pzRalado = (nome: string) => {
    const lista: any[] = [];
    const m4 = new T.Matrix4();
    const v = new T.Vector3();
    secoes.forEach((g: any, indice: number) => {
      if (!g || !g.userData.particulas || !g.userData.particulas[nome]) return;
      const inst = g.userData.particulas[nome];
      const vivas = inst.userData.vivas || [];
      for (let i = 0; i < inst.count; i += 1) {
        inst.getMatrixAt(i, m4);
        v.setFromMatrixPosition(m4);
        const superficie = alturaDaSuperficie(indice, v.x, v.z, nome, Infinity);
        const part = vivas.find((p: any) => p.id === i);
        lista.push({
          x: +v.x.toFixed(3),
          y: +v.y.toFixed(3),
          z: +v.z.toFixed(3),
          superficie: +superficie.toFixed(3),
          folga: +(v.y - superficie).toFixed(3),
          alvo: part ? +part.alvo.toFixed(3) : null,
          py: part ? +part.y.toFixed(3) : null,
          fixo: part ? Boolean(part.fixo) : null,
        });
      }
    });
    return lista;
  };

  window.__pzFioSig = () => (fios as any[]).map((f: any) => {
    const pos = f.malha.geometry.getAttribute('position');
    let soma = 0;
    for (let i = 0; i < pos.count; i += 37) soma += pos.getX(i) + pos.getY(i) * 3 + pos.getZ(i) * 7;
    return { nome: f.malha.userData.nome, pontos: f.pontos.length, assinatura: +soma.toFixed(4) };
  });

  // caixa do mundo por peça: permite comparar a BASE da peça com a superfície
  // quem está dando o apoio num ponto: nome da peça e altura que ela oferece
  window.__pzApoio = (indice: number, x: number, z: number, raio: number) => {
    const g = secoes[indice];
    const m4 = new T.Matrix4();
    const v = new T.Vector3();
    const contribuintes: any[] = [];
    if (g) {
      for (const c of g.children) {
        if (c.userData.particulas || c.userData.cozido) continue;
        if (!c.userData.estatico || c.userData.topoCorpo == null) continue;
        const r = (c.userData.raio || 0.05) * 0.5 + raio * 0.2;
        const dx = x - c.position.x;
        const dz = z - c.position.z;
        if (dx * dx + dz * dz <= r * r) {
          contribuintes.push({ nome: c.userData.nome, topo: +(c.position.y + c.userData.topoCorpo).toFixed(4), raio: +(c.userData.raio || 0).toFixed(3), dist: +Math.hypot(dx, dz).toFixed(3) });
        }
      }
      const camadas = g.userData.particulas;
      if (camadas) {
        for (const chave of Object.keys(camadas)) {
          const inst: any = camadas[chave];
          if (!inst || !inst.count) continue;
          for (let k = 0; k < inst.count; k += 1) {
            inst.getMatrixAt(k, m4);
            v.setFromMatrixPosition(m4);
            if (Math.hypot(x - v.x, z - v.z) <= raio * 1.15) { contribuintes.push({ nome: `${chave}#floco`, topo: +(v.y + 0.003).toFixed(4) }); break; }
          }
        }
      }
    }
    contribuintes.sort((a, b) => b.topo - a.topo);
    return { altura: topoDaPilha(g, x, z, raio, null), contribuintes: contribuintes.slice(0, 5) };
  };

  window.__pzCaixas = () => {
    const caixa = new T.Box3();
    const saida: any[] = [];
    secoes.forEach((g: any) => {
      if (!g) return;
      g.children.forEach((c: any) => {
        if (!c.userData.nome) return;
        caixa.setFromObject(c);
        saida.push([c.userData.nome, +caixa.min.y.toFixed(3), +caixa.max.y.toFixed(3), {
          baseCorpo: c.userData.baseCorpo != null ? +c.userData.baseCorpo.toFixed(3) : null,
          topoCorpo: c.userData.topoCorpo != null ? +c.userData.topoCorpo.toFixed(3) : null,
          pisoCorpo: c.userData.pisoCorpo != null ? +c.userData.pisoCorpo.toFixed(3) : null,
          centroY: c.userData.centroLocal ? +c.userData.centroLocal.y.toFixed(3) : null,
        }]);
      });
    });
    return saida;
  };

  // controle de câmera para inspeção: altura baixa mostra a seção do corte de lado
  // onde está a ponta do corte, em coordenada de mundo: usada para posicionar a câmera
  // custo por quadro: chamadas de desenho, triângulos, geometrias e texturas na memória
  window.__pzPerf = () => ({ msLoop: +_msLoop.toFixed(2), quadros });
  window.__pzInfo = () => ({
    chamadas: renderer.info.render.calls,
    triangulos: renderer.info.render.triangles,
    geometrias: renderer.info.memory.geometries,
    texturas: renderer.info.memory.textures,
  });

  window.__pzGap = () => {
    const meio = (ARCO_BORDA + Math.PI * 2) / 2;
    const v = new T.Vector3(Math.cos(meio) * 0.965, Math.sin(meio) * 0.965, 0);
    bordaMalha.updateMatrixWorld(true);
    bordaMalha.localToWorld(v);
    return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3), az: +Math.atan2(v.z, v.x).toFixed(3) };
  };

  window.__pzCamera = (altura: number, raio: number, alvoY = 0.1, azimute = 0.34, olharX = 0, olharZ = 0) => {
    camera.position.set(raio * Math.cos(azimute), altura, raio * Math.sin(azimute));
    camera.lookAt(olharX, alvoY, olharZ);
    camera.updateProjectionMatrix();
    sujo = true;
    return { x: +camera.position.x.toFixed(2), y: +camera.position.y.toFixed(2), z: +camera.position.z.toFixed(2) };
  };

  window.__pzPerdidos = (indice: number) => fiosPerdidos(indice);

  window.__pzLoop = () => ({ ...((window as any).__pzContagem || {}), pendentes: (window as any).__pzPendentes || 0, quadros });

  window.__pzParticulas = () => secoes.map((g: any) => {
    if (!g || !g.userData.particulas) return {};
    const saida: any = {};
    for (const [nome, inst] of Object.entries(g.userData.particulas as any)) {
      const vivas = ((inst as any).userData.vivas || []) as any[];
      const amostra = vivas.slice(0, 3).map((v) => ({ x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3), alvo: +v.alvo?.toFixed(3), esc: +(v.esc || 0).toFixed(2) }));
      const m = new T.Matrix4();
      const v = new T.Vector3();
      (inst as any).getMatrixAt(Math.max(0, ((inst as any).count || 1) - 1), m);
      v.setFromMatrixPosition(m);
      const esc = new T.Vector3().setFromMatrixScale(m);
      saida[nome] = {
        count: (inst as any).count,
        emitidas: (inst as any).userData.emitidas,
        vivas: vivas.length,
        geo: (inst as any).geometry?.type,
        material: !!(inst as any).material?.map,
        visivel: (inst as any).visible,
        opacidade: (inst as any).material?.opacity,
        ultimoY: +v.y.toFixed(4),
        ultimoEsc: +esc.x.toFixed(3),
        amostra,
      };
    }
    return saida;
  });
  window.__pzEmissores = () => emissores.map((e: any) => ({ nome: e.nome, criados: e.criados, total: e.total, vivas: e.vivas.length, pendentes: pendentesDeApoio.slice() }));

  window.__pzPerf = () => ({
    emissores: emissores.length,
    fiosVivos: emissores.reduce((soma: number, e: any) => soma + e.vivas.length, 0),
    corpos: corpos.size,
    dormindo: [...corpos.values()].filter((c: any) => c._dormiu).length,
    estaticos: [...corpos.values()].filter((c: any) => c._estatico).length,
    paradosMeioSeg: [...corpos.values()].filter((c: any) => (c._parado || 0) > 0.45).length,
    instancias: secoes.reduce((soma: number, g: any) => {
      let n = 0;
      if (g && g.userData.particulas) for (const k of Object.keys(g.userData.particulas)) n += g.userData.particulas[k].count;
      return soma + n;
    }, 0),
  });

  window.__pzFolga = () => {
    const raio = new T.Raycaster();
    const baixo = new T.Vector3(0, -1, 0);
    const linhas: any[] = [];
    for (const g of (secoes as any[])) {
      if (!g) continue;
      for (const malha of g.children) {
        if (!malha.userData.nome) continue;
        malha.updateMatrixWorld(true);
        const caixa = new T.Box3().setFromObject(malha);
        const centro = caixa.getCenter(new T.Vector3());
        raio.set(new T.Vector3(centro.x, caixa.min.y - 0.0012, centro.z), baixo);
        const toques = raio.intersectObjects(grupo.children as any[], true).filter((h: any) => {
          let o: any = h.object;
          while (o) {
            if (o === malha) return false;
            o = o.parent;
          }
          return true;
        });
        const apoio = toques.length ? toques[0]!.point.y : null;
        const abaixo = toques.slice(0, 3).map((h: any) => {
          let o: any = h.object;
          let nome = null;
          while (o) {
            if (o.userData && o.userData.nome) { nome = o.userData.nome; break; }
            o = o.parent;
          }
          return { y: +h.point.y.toFixed(3), nome: nome || h.object.geometry.type };
        });
        linhas.push({
          nome: malha.userData.nome,
          x: +malha.getWorldPosition(new T.Vector3()).x.toFixed(3),
          z: +malha.getWorldPosition(new T.Vector3()).z.toFixed(3),
          fundo: +caixa.min.y.toFixed(3),
          apoio: apoio == null ? null : +apoio.toFixed(3),
          folga: apoio == null ? null : +(caixa.min.y - apoio).toFixed(4),
          abaixo,
        });
      }
    }
    return linhas;
  };

  window.__pzPerfil = (x = 0.3, z = 0.2) => {
    const raio = new T.Raycaster();
    raio.set(new T.Vector3(x, 2.5, z), new T.Vector3(0, -1, 0));
    return raio.intersectObjects(grupo.children as any[], true).slice(0, 14).map((h: any) => {
      let o: any = h.object;
      let nome = null;
      while (o) {
        if (o.userData && o.userData.nome) { nome = o.userData.nome; break; }
        o = o.parent;
      }
      return { y: +h.point.y.toFixed(3), nome: nome || h.object.geometry.type };
    });
  };

  // leitura de fora do contexto da página (ferramenta de teste, devtools de outro mundo):
  // o hook devolve o JSON da folga num <pre> escondido em vez de só no escopo do módulo
  document.addEventListener('pelligavi:folga', () => {
    let alvo = document.getElementById('pz-folga');
    if (!alvo) {
      alvo = document.createElement('pre');
      alvo.id = 'pz-folga';
      alvo.style.display = 'none';
      document.body.append(alvo);
    }
    alvo.textContent = JSON.stringify({
      folga: window.__pzFolga(),
      vel: window.__pzVel ? window.__pzVel() : [],
      det: window.__pzDetalhe ? window.__pzDetalhe() : [],
      malhas: (secoes as any[]).flatMap((g: any, indice: number) => (g ? g.children.map((c: any) => ({ c, indice })) : []))
        .filter(({ c }: any) => c.userData && c.userData.nome)
        .slice(0, 12)
        .map(({ c, indice }: any) => {
          const mat: any = Array.isArray(c.material) ? c.material[1] || c.material[0] : c.material;
          const mundo = c.getWorldPosition(new T.Vector3());
          return {
            secao: indice,
            nome: c.userData.nome,
            x: +c.position.x.toFixed(3),
            z: +c.position.z.toFixed(3),
            visivel: c.visible,
            yMundo: +mundo.y.toFixed(3),
            array: Array.isArray(c.material),
            mapa: Boolean(mat && mat.map),
            cor: mat && mat.color ? mat.color.getHexString() : null,
          };
        }),
      perf: window.__pzPerf ? window.__pzPerf() : {},
    });
  });

  return {
    atualizar: (novo: any) => aplicar(novo, true),
    definirTamanho: (id: any) => {
      const mapa = { p: 0.95, m: 1.12, g: 1.26 };
      const f = (mapa as Record<string, number>)[id] || 1;
      grupo.scale.setScalar(f);
      sombra.scale.setScalar(1.12 * f);
      prato.scale.setScalar(Math.min(1.12, f));
      aro.scale.setScalar(Math.min(1.12, f));
      sujo = true;
    },
    destruir: () => {
      renderer.setAnimationLoop(null);
      redimensionar.disconnect();
      renderer.dispose();
      cena.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materiais = Array.isArray(obj.material) ? obj.material : [obj.material];
          materiais.forEach((m: any) => m.dispose());
        }
      });
    },
  };
};

const pizzaEstatica = (T: any, { partes = 1, secoes = [], bordaId = 'tradicional', tamanhoId = 'm' }) => {
  const grupo = new T.Group();
  const padr = (geo: any, cor: any, aspereza = 0.8) => new T.Mesh(geo, new T.MeshStandardMaterial({ color: cor, roughness: aspereza }));

  const massa = padr(new T.CylinderGeometry(1, 1.02, 0.15, 64), CORES.massa, 0.86);
  grupo.add(massa);

  const borda = padr(new T.TorusGeometry(0.965, 0.105, 16, 64), CORES.massaBaixa, 0.82);
  borda.rotation.x = -Math.PI / 2;
  borda.position.y = 0.045;
  grupo.add(borda);

  if (bordaId !== 'tradicional') {
    const recheio = padr(new T.TorusGeometry(0.965, 0.048, 10, 64), RECHEIOS[bordaId] || RECHEIOS.catupiry, 0.55);
    recheio.rotation.x = -Math.PI / 2;
    recheio.position.y = 0.045;
    grupo.add(recheio);
  }

  const molho = padr(new T.CircleGeometry(0.9, 64), CORES.molho, 0.62);
  molho.rotation.x = -Math.PI / 2;
  molho.position.y = 0.079;
  grupo.add(molho);

  const queijo = padr(new T.CircleGeometry(0.85, 64), CORES.queijo, 0.52);
  queijo.rotation.x = -Math.PI / 2;
  queijo.position.y = 0.088;
  grupo.add(queijo);


  const pontos = gradeDePontos(0.68);
  const passo = (Math.PI * 2) / partes;
  const inicio = -Math.PI / 2;
  const baldes: any[][] = Array.from({ length: partes }, () => []);
  for (const ponto of pontos) {
    const ang = (Math.atan2(ponto.z, ponto.x) - inicio + Math.PI * 4) % (Math.PI * 2);
    baldes[Math.min(partes - 1, Math.floor(ang / passo))].push(ponto);
  }

  secoes.forEach((lista, indice) => {
    const ocupados: any = [];
    const desejado = contar(lista);
    const ordem = Object.keys(desejado).sort((a, b) => (ehFio(a) ? 1 : 0) - (ehFio(b) ? 1 : 0));
    for (const nome of ordem) {
      if (ehFio(nome)) {
        const obstaculos = ocupados.map((o: any) => ({ x: o.x, z: o.z, raio: 0.05 }));
        const curva = caminhoFio(T, partes, indice, obstaculos);
        if (curva.length >= 4) {
          const geo = new T.TubeGeometry(new T.CatmullRomCurve3(curva), Math.max(80, curva.length), 0.045, 7, false);
          grupo.add(padr(geo, '#f7eed6', 0.85));
        }
        continue;
      }
      for (let k = 0; k < desejado[nome]; k++) {
        const balde = baldes[indice % partes] || pontos;
        let escolhido: any = balde[Math.floor(Math.random() * balde.length)];
        if (ocupados.length) {
          let melhor = -Infinity;
          for (const ponto of balde) {
            let folga = Infinity;
            for (const q of ocupados as any[]) {
              const d = Math.hypot(ponto.x - q.x, ponto.z - q.z);
              if (d < folga) folga = d;
            }
            if (folga > melhor) {
              melhor = folga;
              escolhido = ponto;
            }
          }
        }
        ocupados.push(escolhido);
        const malha = malhaTopping(T, nome);
        malha.scale.multiplyScalar(escolhido.escala * 0.95);
        malha.position.set(escolhido.x, 0, escolhido.z);
        grupo.add(malha);
        malha.updateMatrixWorld(true);
        const caixa = new T.Box3().setFromObject(malha);
        malha.position.y = 0.088 + Math.max(0.015, caixa.max.y);
        malha.rotation.y = rnd() * Math.PI * 2;
      }
    }
  });

  const fatores = { p: 0.95, m: 1.12, g: 1.26 };
  const fator = (fatores as Record<string, number>)[tamanhoId] || 1.05;
  const escala = Math.min(0.62, 0.56 * fator);
  grupo.scale.setScalar(escala);

  const materiais: any = [];
  grupo.traverse((obj: any) => {
    if (obj.isMesh && obj.material && obj.material.color) {
      materiais.push({ material: obj.material, original: obj.material.color.clone() });
    }
  });

  const charColor = new T.Color('#3a1c0b');
  const dourar = new T.Color('#a9671f');
  const charrar = (k: any) => {
    const dourado = Math.min(1, k * 0.9);
    const queimado = Math.min(0.85, Math.max(0, k - 0.25) * 1.15);
    for (const item of (materiais as any[])) {
      item.material.color.copy(item.original).lerp(dourar, dourado).lerp(charColor, queimado);
    }
  };

  return { grupo, charrar, escala };
};

export const criarForno = async (canvas: any, opcoes: any = {}) => {
  let T;
  try {
    T = await carregarThree();
  } catch {
    return null;
  }

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PERFIL.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const cena = new T.Scene();
  const camera = new T.PerspectiveCamera(44, 1, 0.1, 80);
  camera.position.set(1.85, 2.35, 5.1);
  camera.lookAt(-0.1, 0.62, 0.15);

  cena.add(new T.HemisphereLight('#ffe0b8', '#241610', 1.15));
  const braseiro = new T.PointLight('#ff7a2a', 20, 8, 2);
  braseiro.position.set(-2.2, 0.85, -0.25);
  cena.add(braseiro);
  const externo = new T.DirectionalLight('#ffc691', 2.0);
  externo.position.set(-2.2, 3.4, 4.6);
  cena.add(externo);
  const preenchimento = new T.DirectionalLight('#8fa8ff', 0.4);
  preenchimento.position.set(4, 1.8, -2.2);
  cena.add(preenchimento);
  const luzMesa = new T.PointLight('#ffd0a0', 9, 5, 2);
  luzMesa.position.set(2.05, 1.7, 0.9);
  cena.add(luzMesa);

  const chao = new T.Mesh(
    new T.CircleGeometry(12, 48),
    new T.MeshStandardMaterial({ color: '#150d09', roughness: 1 })
  );
  chao.rotation.x = -Math.PI / 2;
  cena.add(chao);

  const forno = new T.Group();
  forno.position.set(-1.95, 0, -0.35);
  cena.add(forno);

  const corpo = new T.Mesh(
    new T.BoxGeometry(1.9, 1.75, 1.5),
    new T.MeshStandardMaterial({ color: '#6b3a2a', roughness: 0.96 })
  );
  corpo.position.set(0, 0.88, -0.9);
  forno.add(corpo);

  const argamassa = new T.MeshStandardMaterial({ color: '#916047', roughness: 0.98 });
  for (let linha = 0; linha < 5; linha++) {
    const rij = new T.Mesh(new T.BoxGeometry(1.92, 0.022, 0.02), argamassa);
    rij.position.set(0, 0.16 + linha * 0.34, -0.14);
    forno.add(rij);
  }

  const forma = new T.Shape();
  forma.moveTo(-0.62, -0.72);
  forma.lineTo(-0.62, 0.08);
  forma.absarc(0, 0.08, 0.62, Math.PI, 0, true);
  forma.lineTo(0.62, -0.72);
  forma.lineTo(-0.62, -0.72);

  const boca = new T.Mesh(
    new T.ShapeGeometry(forma, 28),
    new T.MeshStandardMaterial({ color: '#180b06', emissive: '#ff5f14', emissiveIntensity: 0.55, roughness: 1 })
  );
  boca.position.set(0, 0.78, -0.13);
  forno.add(boca);

  const labareda = new T.Mesh(
    new T.PlaneGeometry(1.05, 1.0),
    new T.MeshBasicMaterial({ color: '#ff8a2e', transparent: true, opacity: 0.3, depthWrite: false })
  );
  labareda.position.set(0, 0.6, -0.12);
  forno.add(labareda);

  const laje = new T.Mesh(
    new T.BoxGeometry(2.4, 0.12, 2.6),
    new T.MeshStandardMaterial({ color: '#2b211c', roughness: 0.96 })
  );
  laje.position.set(-1.95, 0.06, 0.55);
  cena.add(laje);

  const bag = new T.Group();
  bag.position.set(0.2, 0, 0.3);
  cena.add(bag);

  const corBag = new T.MeshStandardMaterial({ color: '#3a2f26', roughness: 0.8, metalness: 0.05 });
  const caixa = new T.Mesh(new T.BoxGeometry(1.05, 0.75, 0.75), corBag);
  caixa.position.y = 0.38;
  bag.add(caixa);

  const alca = new T.Mesh(new T.TorusGeometry(0.3, 0.04, 6, 20, Math.PI), new T.MeshStandardMaterial({ color: '#1a1410', roughness: 0.9 }));
  alca.position.set(0, 0.76, 0);
  bag.add(alca);

  const reforco = new T.Mesh(new T.TorusGeometry(0.53, 0.03, 6, 28), new T.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.6, metalness: 0.2 }));
  reforco.rotation.x = Math.PI / 2;
  reforco.position.y = 0.74;
  reforco.scale.set(1, 1, 0.72);
  bag.add(reforco);

  const placa = new T.Mesh(
    new T.BoxGeometry(0.42, 0.26, 0.02),
    new T.MeshStandardMaterial({ color: '#c9a44a', roughness: 0.45, metalness: 0.35 })
  );
  placa.position.set(0, 0.4, 0.38);
  bag.add(placa);

  const tampa = new T.Mesh(new T.BoxGeometry(1.07, 0.05, 0.79), corBag);
  tampa.position.set(0, 0.76, 0);
  tampa.rotation.x = -0.9;
  bag.add(tampa);

  const mesa = new T.Group();
  mesa.position.set(2.15, 0, 0.2);
  cena.add(mesa);

  const tampo = new T.Mesh(
    new T.CylinderGeometry(1.05, 1.05, 0.09, 36),
    new T.MeshStandardMaterial({ color: '#6f4a2c', roughness: 0.75 })
  );
  tampo.position.y = 0.6;
  mesa.add(tampo);

  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const pe = new T.Mesh(
      new T.CylinderGeometry(0.05, 0.06, 0.62, 10),
      new T.MeshStandardMaterial({ color: '#4a3120', roughness: 0.85 })
    );
    pe.position.set(Math.cos(ang) * 0.55, 0.3, Math.sin(ang) * 0.55);
    pe.rotation.z = Math.cos(ang) * 0.08;
    pe.rotation.x = -Math.sin(ang) * 0.08;
    mesa.add(pe);
  }

  const pratoMesa = new T.Mesh(
    new T.CylinderGeometry(0.56, 0.52, 0.03, 40),
    new T.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.35 })
  );
  pratoMesa.position.y = 0.655;
  mesa.add(pratoMesa);

  const pizza = pizzaEstatica(T, {
    partes: opcoes.partes || 1,
    secoes: opcoes.secoes || [],
    bordaId: opcoes.bordaId || 'tradicional',
    tamanhoId: opcoes.tamanhoId || 'm',
  });
  const pizzaGrupo = pizza.grupo;
  pizzaGrupo.position.set(-1.95, 0.16, 1.35);
  cena.add(pizzaGrupo);

  const fumacas: any = [];
  for (let i = 0; i < 28; i++) {
    const nuvem = new T.Mesh(
      new T.SphereGeometry(aleatorio(0.06, 0.16), 8, 6),
      new T.MeshBasicMaterial({ color: '#f6e7d2', transparent: true, opacity: 0 })
    );
    nuvem.visible = false;
    cena.add(nuvem);
    fumacas.push({ malha: nuvem, vida: 0 });
  }

  const soltarFumaca = (x: any, y: any, z: any, forca = 1) => {
    const nuvem = fumacas.find((f: any) => f.vida <= 0);
    if (!nuvem) return;
    nuvem.vida = 1;
    nuvem.malha.visible = true;
    nuvem.malha.position.set(x + aleatorio(-0.15, 0.15), y, z + aleatorio(-0.15, 0.15));
    nuvem.malha.material.opacity = 0.35 * forca;
    nuvem.malha.scale.setScalar(1);
  };

  const ajustar = () => {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    const distancia = camera.aspect < 1.3 ? 1.55 : camera.aspect < 1.7 ? 1.2 : 1;
    camera.position.set(1.85 * distancia, 2.35 * distancia, 5.1 * distancia);
    camera.lookAt(-0.1, 0.62, 0.15);
    camera.updateProjectionMatrix();
  };

  const redimensionar = new ResizeObserver(ajustar);
  redimensionar.observe(canvas);
  ajustar();

  const relogio = new T.Clock();
  let aquecido = 0;

  let _ultimoC = performance.now();
  const animar = () => {

    const dt = Math.min(relogio.getDelta(), 0.05);
    const t = relogio.elapsedTime;
    const brilho = 0.5 + Math.sin(t * 7) * 0.14;
    boca.material.emissiveIntensity = brilho;
    braseiro.intensity = 16 + brilho * 12;
    labareda.material.opacity = 0.24 + brilho * 0.18;

    const entrarFim = 2.1;
    const fornoFim = 3.4;
    const sairFim = 4.6;
    const bagFim = 5.6;
    const mesaFim = 6.8;

    if (t < entrarFim) {
      const k = Math.max(0, (t - 0.6) / 1.5);
      pizzaGrupo.position.set(-1.95, 0.16, 1.35 - 1.85 * Math.min(1, k));
      pizzaGrupo.rotation.z = 0;
    } else if (t < fornoFim) {
      aquecido = Math.min(0.6, (t - entrarFim) / (fornoFim - entrarFim));
      pizza.charrar(aquecido * 0.75);
      pizzaGrupo.position.set(-1.95, 0.16, -0.5);
      pizzaGrupo.rotation.y += dt * 0.6;
      if (Math.random() < dt * 8) soltarFumaca(-1.95, 0.35, -0.05, 0.7);
    } else if (t < sairFim) {
      const k = (t - fornoFim) / (sairFim - fornoFim);
      pizza.charrar(0.55 + k * 0.45);
      pizzaGrupo.position.set(-1.95, 0.16, -0.5 + 1.9 * k);
      if (Math.random() < dt * 10) soltarFumaca(-1.95, 0.3, -0.15 + k, 0.9);
    } else if (t < bagFim) {
      const k = (t - sairFim) / (bagFim - sairFim);
      const x = -1.95 + (0.2 - -1.95) * Math.min(1, k * 1.4);
      const y = 0.16 + Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.55 - Math.max(0, k - 0.6) * 0.5;
      pizzaGrupo.position.set(x, Math.max(0.35, y), 1.4 + (0.3 - 1.4) * Math.min(1, k * 1.4));
      pizzaGrupo.rotation.z = Math.sin(k * Math.PI) * 0.25;
      tampa.rotation.x = -0.9 + Math.min(1, Math.max(0, (k - 0.55) * 2.2)) * 0.9;
    } else if (t < mesaFim) {
      const k = (t - bagFim) / (mesaFim - bagFim);
      pizzaGrupo.visible = k > 0.55;
      if (pizzaGrupo.visible) {
        const kk = (k - 0.55) / 0.45;
        pizzaGrupo.position.set(2.15, 0.7 + (1 - kk) * 0.5, 0.2);
        pizzaGrupo.rotation.z = (1 - kk) * 0.3;
      }
    } else {
      pizzaGrupo.visible = true;
      pizzaGrupo.position.set(2.15, 0.7, 0.2);
      pizzaGrupo.rotation.z = 0;
      pizza.charrar(1);
      if (Math.random() < dt * 6) soltarFumaca(2.15, 0.86, 0.2, 0.55);
    }

    for (const f of (fumacas as any[])) {
      if (f.vida <= 0) continue;
      f.vida -= dt * 0.5;
      f.malha.position.y += dt * 0.4;
      f.malha.position.x += dt * 0.08;
      f.malha.material.opacity = Math.max(0, f.vida) * 0.32;
      f.malha.scale.setScalar(1 + (1 - f.vida) * 0.9);
      if (f.vida <= 0) f.malha.visible = false;
    }

    renderer.render(cena, camera);
  };

  renderer.setAnimationLoop(animar);


  return {
    destruir: () => {
      renderer.setAnimationLoop(null);
      redimensionar.disconnect();
      renderer.dispose();
      cena.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materiais = Array.isArray(obj.material) ? obj.material : [obj.material];
          materiais.forEach((m: any) => m.dispose());
        }
      });
    },
  };
};

// Exporta a peça procedural como GLB: é assim que o modelo do servidor passa a ser
// exatamente o que o motor desenha — mesma geometria, mesma UV, mesmo material base.
export const exportarPeca = async (nome: string) => {
  const T = three as any;
  const malha = malhaTopping(T, nome);
  if (!malha) throw new Error(`sem peça para ${nome}`);
  // exporta só a geometria: textura/imagem não fazem parte do modelo (o material vem da receita)
  malha.traverse((o: any) => {
    if (o.isMesh && o.material) {
      const materiais = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materiais) m.map = null;
    }
  });
  malha.updateMatrixWorld(true);
  const exportador = new GLTFExporter();
  const glb: ArrayBuffer = await new Promise((ok, erro) => {
    exportador.parse(malha, (resultado: any) => ok(resultado as ArrayBuffer), erro, { binary: true, onlyVisible: false });
  });
  const bytes = new Uint8Array(glb);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const caixa = new T.Box3().setFromObject(malha);
  let triangulos = 0;
  malha.traverse((o: any) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    triangulos += g.index ? g.index.count / 3 : (g.attributes?.position?.count ?? 0) / 3;
  });
  return {
    base64: btoa(binario),
    triangulos,
    largura: +(caixa.max.x - caixa.min.x).toFixed(4),
    profundidade: +(caixa.max.z - caixa.min.z).toFixed(4),
    altura: +(caixa.max.y - caixa.min.y).toFixed(4),
  };
};

// Exporta a textura procedural do ingrediente como PNG: o servidor passa a guardar
// exatamente o padrão que o motor desenhava (mesma cor, mesmas manchas).
export const exportarTextura = (nome: string) => {
  const T = three as any;
  const cor = String(receitaDe(nome).cor ?? '');
  if (!cor) throw new Error(`ingrediente ${nome} sem cor no servidor`);
  const tex = texturaTopping(T, nome, cor);
  const canvas = tex.image as HTMLCanvasElement;
  const data = canvas.toDataURL('image/png');
  return { base64: data, largura: canvas.width, altura: canvas.height };
};
