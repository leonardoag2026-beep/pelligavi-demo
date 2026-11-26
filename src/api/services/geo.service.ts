import { SITE } from '../../shared/config/site.js';

export interface Ponto {
  lat: number;
  lng: number;
}

const CHAVE_CACHE = 'pelligavi:geo:v1';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

const tabs = (): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE) || '{}');
  } catch {
    return {};
  }
};

const guardar = (consulta: string, ponto: any) => {
  const atual = tabs();
  atual[consulta] = ponto;
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(atual));
  } catch {
    void 0;
  }
};

export const distanciaKm = (a: Ponto, b: Ponto): number => {
  const raioTerra = 6371;
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * raioTerra * Math.asin(Math.min(1, Math.sqrt(h)));
};

// faixas de CEP da Grande São Paulo: usadas quando o geocodificador não responde
const FAIXAS: Array<[number, number, number, number]> = [
  [1000, 1599, -23.5489, -46.6388],
  [2000, 2999, -23.5005, -46.6250],
  [3000, 3999, -23.5400, -46.6200],
  [4000, 4599, -23.5900, -46.6350],
  [4600, 4999, -23.6200, -46.6900],
  [5000, 5099, -23.5350, -46.6800],
  [5100, 5299, -23.5300, -46.6900],
  [5300, 5399, -23.5250, -46.7300],
  [5400, 5499, -23.5570, -46.6890],
  [5500, 5599, -23.5800, -46.6800],
  [5600, 5699, -23.6000, -46.7200],
  [5700, 5799, -23.5700, -46.7300],
  [5800, 5899, -23.6000, -46.7400],
  [6000, 6999, -23.5320, -46.7920],
  [7000, 7999, -23.4540, -46.5330],
  [8000, 8499, -23.5400, -46.4500],
  [9000, 9999, -23.6600, -46.5300],
];

const porCep = (cep: string): Ponto | null => {
  const numero = Number(cep.replace(/\D/g, '').padStart(8, '0').slice(0, 5));
  if (!numero) return null;
  for (const [de, ate, lat, lng] of FAIXAS) {
    if (numero >= de && numero <= ate) return { lat, lng };
  }
  return null;
};

const consultarNominatim = async (consulta: string): Promise<Ponto | null> => {
  try {
    const url = `${NOMINATIM}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`;
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (!Array.isArray(dados) || !dados.length) return null;
    return { lat: Number(dados[0].lat), lng: Number(dados[0].lon) };
  } catch {
    return null;
  }
};

export interface EnderecoParaLocalizar {
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
}

const coordenadaDoCep = async (entrada: string): Promise<Ponto | null> => {
  const digitos = entrada.replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  const chave = `cogeo:${digitos}`;
  const cache = tabs()[chave];
  if (cache) return cache as Ponto;
  try {
    const url = `${PHOTON}?q=${encodeURIComponent(digitos)}&limit=3&lat=${CENTRO.lat}&lon=${CENTRO.lng}&osm_tag=place:postcode`;
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const item = (dados?.features || []).find((f: any) => {
      const p = f?.properties || {};
      return p.osm_value === 'postcode' && String(p.countrycode || '').toUpperCase() === 'BR';
    });
    if (!item) return null;
    const extensao = item.properties.extent;
    const [lng, lat] = item.geometry.coordinates;
    const ponto = Array.isArray(extensao) && extensao.length === 4
      ? { lat: (extensao[1] + extensao[3]) / 2, lng: (extensao[0] + extensao[2]) / 2 }
      : { lat, lng };
    if (!Number.isFinite(ponto.lat) || !Number.isFinite(ponto.lng)) return null;
    guardar(chave, ponto);
    return ponto;
  } catch {
    return null;
  }
};

export const localizar = async (endereco: EnderecoParaLocalizar): Promise<Ponto | null> => {
  const consulta = [
    `${endereco.rua}, ${endereco.numero}`.trim(),
    endereco.bairro,
    endereco.cidade,
    endereco.cep,
  ]
    .filter(Boolean)
    .join(', ');

  const cache = tabs()[consulta];
  if (cache) return cache;

  const achado = await consultarNominatim(consulta);
  if (achado) {
    guardar(consulta, achado);
    return achado;
  }

  const doCep = await coordenadaDoCep(endereco.cep);
  if (doCep) {
    guardar(consulta, doCep);
    return doCep;
  }

  const aproximado = porCep(endereco.cep) || porCep(`${endereco.cep}`);
  if (aproximado) guardar(consulta, aproximado);
  return aproximado;
};

export const CENTRO: Ponto = SITE.geo;
export const RAIO_ENTREGA_KM = SITE.raioEntregaKm;

export interface ResultadoRaio {
  dentro: boolean;
  km: number | null;
  erro: string | null;
}

export const verificarRaio = async (endereco: EnderecoParaLocalizar): Promise<ResultadoRaio> => {
  const ponto = await localizar(endereco);
  if (!ponto) {
    return {
      dentro: false,
      km: null,
      erro: 'Não conseguimos localizar o endereço. Confira o CEP, a rua e o número.',
    };
  }
  const km = distanciaKm(CENTRO, ponto);
  if (km > RAIO_ENTREGA_KM) {
    return {
      dentro: false,
      km,
      erro: `Entregamos até ${RAIO_ENTREGA_KM} km da pizzaria. Este endereço está a ${km.toFixed(1).replace('.', ',')} km — escolha retirar no balcão.`,
    };
  }
  return { dentro: true, km, erro: null };
};

export interface Sugestao {
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  lat: number;
  lng: number;
}

const PHOTON = 'https://photon.komoot.io/api/';

export const sugerir = async (consulta: string): Promise<Sugestao[]> => {
  const texto = consulta.trim();
  if (texto.length < 4) return [];
  const cache = tabs()[`photon:${texto}`] as any;
  if (cache) return cache;
  try {
    const url = `${PHOTON}?q=${encodeURIComponent(`${texto} são paulo`)}&limit=5&lat=${CENTRO.lat}&lon=${CENTRO.lng}`;
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return [];
    const dados = await resposta.json();
    const lista: Sugestao[] = (dados?.features || [])
      .map((item: any) => {
        const p = item?.properties || {};
        const [lng, lat] = item?.geometry?.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const rua = p.street || p.name || '';
        if (!rua) return null;
        return {
          rotulo: [rua, p.housenumber, p.district, p.city].filter(Boolean).join(' · '),
          rua,
          numero: p.housenumber || '',
          bairro: p.district || p.suburb || p.city || '',
          cidade: p.city || p.state || '',
          cep: p.postcode || '',
          lat,
          lng,
        } as Sugestao;
      })
      .filter(Boolean) as Sugestao[];
    guardar(`photon:${texto}` as any, lista as any);
    return lista;
  } catch {
    return [];
  }
};

export interface AchadoCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
}

export interface SugestaoCep {
  rotulo: string;
  bairro: string;
  cidade: string;
  faixa: string;
}

const VIACEP = 'https://viacep.com.br/ws';
const BRASILAPI = 'https://brasilapi.com.br/api/cep/v2';

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

export const buscarCep = async (entrada: string): Promise<AchadoCep | null> => {
  const digitos = entrada.replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  const chave = `cep:${digitos}`;
  const cache = tabs()[chave];
  if (cache) return cache as AchadoCep;
  const montar = (dados: any): AchadoCep | null => {
    if (!dados || dados.erro === true || dados.erro === 'true') return null;
    const cidade = texto(dados.localidade) || texto(dados.city);
    if (!cidade) return null;
    return {
      cep: `${digitos.slice(0, 5)}-${digitos.slice(5)}`,
      rua: texto(dados.logradouro) || texto(dados.street),
      bairro: texto(dados.bairro) || texto(dados.neighborhood),
      cidade,
    };
  };
  for (const fonte of [`${VIACEP}/${digitos}/json/`, `${BRASILAPI}/${digitos}`]) {
    try {
      const resposta = await fetch(fonte, { headers: { Accept: 'application/json' } });
      if (!resposta.ok) continue;
      const achado = montar(await resposta.json());
      if (achado) {
        guardar(chave, achado);
        return achado;
      }
    } catch {
      void 0;
    }
  }
  return null;
};

export const sugerirCep = async (entrada: string): Promise<SugestaoCep[]> => {
  const digitos = entrada.replace(/\D/g, '');
  if (digitos.length < 5 || digitos.length === 8) return [];
  const chave = `cepq:${digitos}`;
  const cache = tabs()[chave];
  if (cache) return cache as SugestaoCep[];
  try {
    const url = `${PHOTON}?q=${encodeURIComponent(digitos)}&limit=5&lat=${CENTRO.lat}&lon=${CENTRO.lng}&osm_tag=place:postcode`;
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return [];
    const dados = await resposta.json();
    const lista = (dados?.features || [])
      .map((item: any) => {
        const p = item?.properties || {};
        if (p.osm_value !== 'postcode') return null;
        if (String(p.countrycode || '').toUpperCase() !== 'BR') return null;
        const bairro = texto(p.district) || texto(p.suburb);
        const cidade = texto(p.city) || texto(p.state);
        if (!cidade) return null;
        return {
          rotulo: [bairro, cidade].filter(Boolean).join(' · '),
          bairro,
          cidade,
          faixa: texto(p.name),
        } as SugestaoCep;
      })
      .filter(Boolean) as SugestaoCep[];
    guardar(chave, lista);
    return lista;
  } catch {
    return [];
  }
};
