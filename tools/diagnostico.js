import { criarForja } from '../dist/shared/lib/pizza3d.js';
import { PECAS, EXTRAS } from '../dist/api/services/menu.service.js';

// a aba de diagnóstico pode rodar sem requestAnimationFrame (headless): sem o laço a
// física nunca anda e toda peça fica parada na altura de queda, medindo folga falsa
const relogioFalso = (cb) => setTimeout(() => cb(performance.now()), 16);
window.requestAnimationFrame = relogioFalso;
window.cancelAnimationFrame = (id) => clearTimeout(id);

const saida = document.getElementById('saida');
const linhas = [];
const log = (texto) => { linhas.push(texto); saida.textContent = linhas.join('\n'); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const principal = async () => {
  try {
    const cannon = await import('../dist/shared/lib/cannon-es.js');
    log('cannon ok: ' + Object.keys(cannon).length + ' exports');
  } catch (erro) {
    log('cannon FALHOU: ' + (erro && erro.message ? erro.message : String(erro)));
  }
  const forja = await criarForja(document.getElementById('palco'), {
    partes: 1,
    bordaId: 'tradicional',
    secoes: [],
  });
  if (!forja) { log('sem forja (WebGL indisponível)'); return; }
  log('hook=' + typeof window.__pzFolga + ' forja=' + typeof forja.atualizar);
  log('studio=' + (window.__studio3d ? ('mundo=' + (window.__studio3d.mundo ? 'ok' : 'null') + ' corpos=' + window.__studio3d.corpos.size) : 'sem __studio3d (use ?debug=1)'));
  forja.definirTamanho('g');
  await espera(600);

  const alvos = EXTRAS.map((e) => e.id).filter((id) => id !== 'catupiry');
  const resumo = [];
  for (const id of alvos) {
    const qtd = Math.max(1, PECAS[id] || 6);
    try {
      forja.atualizar({ partes: 1, secoes: [[{ nome: id, qtd }]] });
    } catch (erro) {
      log(id + ' ERRO atualizar: ' + (erro && erro.message ? erro.message : String(erro)));
      continue;
    }
    await espera(1500);
    if (resumo.length === 0) {
      log('secoes=' + JSON.stringify(window.__pzDetalhe ? window.__pzDetalhe().map((a) => a.length) : 'x'));
    }
    await espera(2700);
    if (resumo.length === 0) {
      log('corpos=' + (window.__studio3d ? window.__studio3d.corpos.size : 'x') + ' bodiesMundo=' + (window.__studio3d && window.__studio3d.mundo ? window.__studio3d.mundo.bodies.length : 'x') + ' vel=' + (window.__pzVel ? window.__pzVel().length : 'x'));
      log('perfil1=' + JSON.stringify(window.__pzPerfil ? window.__pzPerfil(0.25, 0.18) : 'x'));
      log('perfil2=' + JSON.stringify(window.__pzPerfil ? window.__pzPerfil(0.55, -0.3) : 'x'));
    }
    const todas = window.__pzFolga ? window.__pzFolga() : [];
    if (resumo.length === 0) {
      log('corpos=' + todas.length + ' perf=' + JSON.stringify(window.__pzPerf ? window.__pzPerf() : {}));
      log('exemplo=' + JSON.stringify(todas.slice(0, 3)));
    }
    const medidas = todas.filter((l) => l.nome === id);
    const acima = medidas.filter((l) => (l.folga ?? 0) > 0.004);
    const max = medidas.reduce((m, l) => Math.max(m, l.folga ?? -1), -1);
    const linha = `${id.padEnd(17)} pecas=${String(medidas.length).padStart(3)} flutua=${String(acima.length).padStart(3)} folgaMax=${max.toFixed(4)}`;
    resumo.push(linha);
    log(linha);
  }
  forja.atualizar({ partes: 1, secoes: [[]] });
  log('--- fim ---');
};

principal().catch((erro) => log('erro: ' + (erro && erro.message ? erro.message : String(erro))));
