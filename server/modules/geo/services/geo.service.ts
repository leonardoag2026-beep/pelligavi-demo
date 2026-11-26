import { ValidacaoError } from '../../../shared/errors/app-error.js';
import { query, um } from '../../../config/db.js';

export interface EnderecoCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface SugestaoRua {
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  rotulo?: string;
}

const UF_POR_ESTADO: Record<string, string> = {
  'são paulo': 'SP', 'rio de janeiro': 'RJ', 'minas gerais': 'MG', 'paraná': 'PR',
  'santa catarina': 'SC', 'rio grande do sul': 'RS', 'bahia': 'BA', 'goiás': 'GO',
  'espírito santo': 'ES', 'pernambuco': 'PE', 'ceará': 'CE', 'pará': 'PA',
};

// cache curto: o Nominatim limita a 1 consulta por segundo
const cacheSugestoes = new Map<string, { quando: number; lista: SugestaoRua[] }>();

const limparCep = (cep: string) => cep.replace(/\D/g, '');

const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// estado devolvido pelo Nominatim ("São Paulo") tem de casar com a UF do CEP ("SP")
const UF_POR_ESTADO_NOME: Record<string, string> = Object.fromEntries(
  Object.entries(UF_POR_ESTADO).map(([estado, uf]) => [semAcento(estado), uf]),
);

const cidadeDoCandidato = (endereco: Record<string, any>): string =>
  String(endereco.city ?? endereco.town ?? endereco.village ?? endereco.municipality ?? endereco.county ?? '');

// o mesmo nome de bairro existe em várias cidades: sem conferir cidade/UF o
// "Jardim Bichinhos" do cliente resolvia no interior (185 km de distância)
const combinaComCidade = (endereco: Record<string, any>, cidadeUf: string): boolean => {
  if (!cidadeUf || !endereco) return true;
  const [cidade, uf] = cidadeUf.split('-').map((parte) => parte.trim());
  const estado = String(endereco.state ?? endereco.region ?? '');
  if (uf) {
    const ufCandidato = (endereco['ISO3166-2-lvl4'] || '').split('-').pop() || UF_POR_ESTADO_NOME[semAcento(estado)] || '';
    if (ufCandidato && ufCandidato.toUpperCase() !== uf.toUpperCase()) return false;
  }
  if (cidade) {
    const nome = semAcento(cidadeDoCandidato(endereco));
    if (nome && !nome.includes(semAcento(cidade))) return false;
  }
  return true;
};

export const geoService = {
  porCep: async (cep: string): Promise<EnderecoCep> => {
    const limpo = limparCep(cep);
    if (limpo.length !== 8) throw new ValidacaoError('CEP precisa ter 8 dígitos');

    const resposta = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!resposta.ok) throw new ValidacaoError('CEP não encontrado');
    const dados: any = await resposta.json();
    if (dados.erro) throw new ValidacaoError('CEP não encontrado');

    return {
      cep: dados.cep ?? cep,
      rua: dados.logradouro ?? '',
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      uf: dados.uf ?? '',
    };
  },

  // coordenada de um endereço livre, com cache em banco (Nominatim tem limite de uso)
  coordenadas: async (texto: string): Promise<{ lat: number; lng: number } | null> => {
    let alvo = texto;
    // CEP no endereço define cidade/UF: sem isso o mesmo nome de rua resolve em outra cidade
    const achado = texto.match(/\b(\d{5})-?(\d{3})\b/);
    let cidadeUf = '';
    if (achado) {
      try {
        const cep = await geoService.porCep(`${achado[1]}${achado[2]}`);
        if (cep?.cidade) {
          cidadeUf = `${cep.cidade} - ${cep.uf}`;
          // o CEP atrapalha o Nominatim: usa-se o CEP para descobrir a cidade, não na consulta
          const semCep = texto.replace(/\b\d{5}-?\d{3}\b/g, '').replace(/,\s*,/g, ',').replace(/[,\s]+$/, '');
          alvo = `${semCep}, ${cidadeUf}, Brasil`;
        }
      } catch {
        // segue com o texto original
      }
    }
    // nome de bairro atrapalha o Nominatim quando ele não conhece o bairro ("Jardim
    // Bichinhos"): a rua sozinha + cidade acha. Ordem: mais específico → mais genérico.
    const partes = alvo.split('—').map((parte) => parte.trim()).filter(Boolean);
    const comCidade = (trecho: string) => (cidadeUf ? `${trecho}, ${cidadeUf}, Brasil` : trecho);
    const ruaNumero = partes[0] ?? '';
    const bairro = partes[1] ?? '';
    const ruaSo = ruaNumero.replace(/,\s*\d{1,5}\s*$/, '').trim();

    const tentativas: string[] = [];
    if (ruaNumero) tentativas.push(comCidade(bairro ? `${ruaNumero} — ${bairro}` : ruaNumero));
    if (ruaNumero) tentativas.push(comCidade(ruaNumero));
    if (ruaSo && ruaSo !== ruaNumero) {
      tentativas.push(comCidade(bairro ? `${ruaSo} — ${bairro}` : ruaSo));
      tentativas.push(comCidade(ruaSo));
    }
    if (bairro) tentativas.push(comCidade(bairro));
    if (!tentativas.length) tentativas.push(comCidade(alvo) || alvo);

    return geoService.buscar(tentativas, cidadeUf);
  },

  // tenta do mais específico ao mais genérico: número pode não estar mapeado no OSM
  buscar: async (entrada: string | string[], cidadeUf = ''): Promise<{ lat: number; lng: number } | null> => {
    const tentativas = (Array.isArray(entrada) ? entrada : [entrada]).filter(Boolean);

    for (const tentativa of tentativas) {
      const consulta = tentativa.trim().toLowerCase().slice(0, 200);
      if (consulta.length < 6) continue;
      const salvo = await um<{ lat: number; lng: number; cidade: string | null; uf: string | null }>(
        `SELECT latitude::float8 AS lat, longitude::float8 AS lng, cidade, uf FROM geo_cache WHERE consulta = $1`,
        [consulta],
      );
      // cache antigo sem cidade ou de outra cidade não serve
      if (salvo) {
        const [cidade, uf] = cidadeUf.split('-').map((parte) => parte.trim());
        const ufOk = !uf || !salvo.uf || salvo.uf.toUpperCase() === uf.toUpperCase();
        const cidadeOk = !cidade || !salvo.cidade || semAcento(salvo.cidade).includes(semAcento(cidade));
        if (ufOk && cidadeOk) return { lat: salvo.lat, lng: salvo.lng };
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(consulta)}`;
      const resposta = await fetch(url, { headers: { 'User-Agent': 'pelligavi-demo/1.0 (contato@pelligavi.com)' } });
      if (!resposta.ok) continue;
      const dados: any = await resposta.json();
      const lista = Array.isArray(dados) ? dados : [];
      // só aceita resultado na cidade/UF do CEP: o mesmo bairro existe em outra cidade
      const primeiro = lista.find((c: any) => combinaComCidade(c.address ?? {}, cidadeUf)) ?? null;
      if (!primeiro) continue;
      const lat = Number(primeiro.lat);
      const lng = Number(primeiro.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      await query(
        `INSERT INTO geo_cache (consulta, latitude, longitude, cidade, uf) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (consulta) DO UPDATE
            SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                cidade = EXCLUDED.cidade, uf = EXCLUDED.uf`,
        [
          consulta,
          lat,
          lng,
          cidadeDoCandidato(primeiro.address ?? {}) || null,
          (String(primeiro.address?.['ISO3166-2-lvl4'] ?? '').split('-').pop() || null),
        ],
      );
      return { lat, lng };
    }
    return null;
  },

  // distância em km entre a loja e o endereço (Haversine)
  distanciaKm: async (endereco: string) => {
    const loja = await um<{ lat: number; lng: number; raio: number }>(
      `SELECT latitude::float8 AS lat, longitude::float8 AS lng, raio_entrega_km::float8 AS raio
         FROM loja_config WHERE id_config = 1`,
    );
    if (!loja || loja.lat == null || loja.lng == null) {
      throw new ValidacaoError('A loja não tem coordenada configurada');
    }
    const ponto = await geoService.coordenadas(endereco);
    if (!ponto) throw new ValidacaoError('Não conseguimos localizar o endereço informado');

    const raioTerra = 6371;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(ponto.lat - loja.lat);
    const dLng = rad(ponto.lng - loja.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(loja.lat)) * Math.cos(rad(ponto.lat)) * Math.sin(dLng / 2) ** 2;
    const distancia = 2 * raioTerra * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
      distanciaKm: Math.round(distancia * 10) / 10,
      raioKm: loja.raio,
      dentro: distancia <= loja.raio,
      latitude: ponto.lat,
      longitude: ponto.lng,
    };
  },

  // sugestões enquanto digita: aceita CEP, nome de rua, bairro ou ponto de referência.
  // Nominatim resolve texto livre; ViaCEP cobre CEP e nomes de rua de São Paulo.
  sugestoes: async (termo: string): Promise<SugestaoRua[]> => {
    const busca = termo.trim();
    if (busca.length < 3) return [];

    const soDigitos = busca.replace(/\D/g, '');
    if (soDigitos.length === 8) {
      try {
        const cep = await geoService.porCep(soDigitos);
        return [{ ...cep, rotulo: `${cep.rua || 'CEP ' + cep.cep} — ${cep.bairro}${cep.cidade ? ', ' + cep.cidade : ''}` }];
      } catch {
        /* CEP inexistente: cai na busca por texto */
      }
    }

    const agora = Date.now();
    const guardada = cacheSugestoes.get(busca.toLowerCase());
    if (guardada && agora - guardada.quando < 300_000) return guardada.lista;

    // ViaCEP acha rua pelo nome (é o que o usuário espera ao digitar "Pinheiros"),
    // o Nominatim cobre bairro, avenida sem CEP e ponto de referência
    const [porRua, porMapa] = await Promise.all([
      geoService.ruas(busca).catch(() => [] as SugestaoRua[]),
      geoService.sugestoesNominatim(busca).catch(() => [] as SugestaoRua[]),
    ]);

    const vistos = new Set<string>();
    const lista: SugestaoRua[] = [];
    for (const item of [...porRua, ...porMapa]) {
      const chave = `${item.rua}|${item.bairro}`.toLowerCase();
      if (!item.rua || vistos.has(chave)) continue;
      vistos.add(chave);
      lista.push({
        ...item,
        rotulo: item.rotulo ?? [item.rua, item.bairro ? `— ${item.bairro}` : '', item.cidade ? `, ${item.cidade}` : ''].join(' ').replace(/\s+,/g, ','),
      });
      if (lista.length >= 8) break;
    }

    // quem tem o bairro igual ao que foi digitado aparece primeiro ("pinheiros" → Pinheiros)
    const digitado = busca.toLowerCase();
    lista.sort((a, b) => {
      const peso = (s: SugestaoRua) => (s.bairro.toLowerCase().includes(digitado) ? 0 : 1);
      return peso(a) - peso(b);
    });

    cacheSugestoes.set(busca.toLowerCase(), { quando: agora, lista });
    return lista;
  },

  sugestoesNominatim: async (busca: string): Promise<SugestaoRua[]> => {
    // primeiro dentro da região da loja (viewbox); se nada, tenta aberto
    const dentro = await geoService.buscarNominatim(busca, true);
    if (dentro.length) return dentro;
    return geoService.buscarNominatim(busca, false);
  },

  buscarNominatim: async (busca: string, naRegiao: boolean): Promise<SugestaoRua[]> => {
    const caixa = naRegiao ? '&viewbox=-47.00,-23.35,-46.35,-23.95&bounded=1' : '';
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8' +
      '&countrycodes=br&accept-language=pt-BR' + caixa + '&q=' +
      encodeURIComponent(`${busca}, São Paulo, Brasil`);
    try {
      const resposta = await fetch(url, { headers: { 'User-Agent': 'pelligavi-demo/1.0 (contato@pelligavi.com)' } });
      if (!resposta.ok) return [];
      const dados: any = await resposta.json();
      if (!Array.isArray(dados)) return [];

      const vistos = new Set<string>();
      const saida: SugestaoRua[] = [];
      for (const linha of dados) {
        const end = linha.address ?? {};
        const rua = end.road || end.pedestrian || end.residential || end.neighbourhood || linha.name || '';
        const bairro = end.suburb || end.neighbourhood || end.city_district || '';
        const cidade = end.city || end.town || end.municipality || 'São Paulo';
        const uf = UF_POR_ESTADO[String(end.state ?? '').toLowerCase()] ?? 'SP';
        const chave = `${rua}|${bairro}`.toLowerCase();
        if (!rua || vistos.has(chave)) continue;
        vistos.add(chave);
        saida.push({
          rua,
          bairro,
          cidade,
          uf,
          cep: (end.postcode ?? '').replace(/\D/g, ''),
          rotulo: [rua, bairro ? `— ${bairro}` : '', cidade ? `, ${cidade}` : ''].join(' ').replace(/\s+,/g, ','),
        });
        if (saida.length >= 6) break;
      }
      // a loja é em São Paulo: sugestão de outra cidade não serve para entrega
      const daCidade = saida.filter((s) => s.cidade.toLowerCase() === 'são paulo');
      if (daCidade.length) return daCidade;
      if (saida.length) return saida;
    } catch {
      /* rede fora: cai no ViaCEP */
    }
    return geoService.ruas(busca);
  },

  ruas: async (termo: string): Promise<SugestaoRua[]> => {
    const busca = termo.trim();
    if (busca.length < 3) return [];

    const url = `https://viacep.com.br/ws/SP/Sao%20Paulo/${encodeURIComponent(busca)}/json/`;
    const resposta = await fetch(url);
    if (!resposta.ok) return [];
    const dados: any = await resposta.json();
    if (!Array.isArray(dados)) return [];

    return dados.slice(0, 8).map((linha: any) => ({
      rua: linha.logradouro ?? '',
      bairro: linha.bairro ?? '',
      cidade: linha.localidade ?? '',
      uf: linha.uf ?? '',
      cep: linha.cep ?? '',
    }));
  },
};

export default geoService;
