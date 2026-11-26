import { brl } from '../../../../shared/utils/format';
import { miniatura } from '../../../../shared/ui/miniaturas';
import { PreviaSTL } from '../../../../shared/ui/previa-stl/previa-stl';
import { PreviaIngrediente } from './previa-ingrediente';
import { CampoDoRender, grupo, type Descritor } from './campo-render';
import type { Geometria, Ingrediente } from '../../../../api/services/ingredientes';

const CLASSES: Array<['rodela' | 'desfiado' | 'espalhado' | 'fio', string]> = [
  ['rodela', 'Rodela'],
  ['desfiado', 'Desfiado'],
  ['espalhado', 'Espalhado'],
  ['fio', 'Fio'],
];

const CAMPOS_TAXA = new Set(['cor', 'particulaCor', 'padrao', 'imagem']);

interface Props {
  prefixo: string;
  item: Ingrediente;
  cfg?: { geometria?: string; params?: Record<string, unknown>; modeloUrl?: string | null; texturaUrl?: string | null };
  geometrias: Geometria[];
  catalogo: Map<string, Geometria>;
  receitaCampos: Descritor[];
  renderCampos: Descritor[];
  flags: Array<[string, string]>;
  valor: (chave: string, padrao: string | number | boolean) => string;
  guardar: (chave: string, valor: string) => void;
  numero: (texto: string) => number;
  novo?: boolean;
  nome: string;
  aoMudarNome: (valor: string) => void;
  modeloUrl?: string | null;
  texturaUrl?: string | null;
  imagemUrl?: string | null;
  arquivosNovos?: { modelo?: string; textura?: string; imagem?: string };
  aoEnviarArquivo: (tipo: 'modelo' | 'textura' | 'imagem', arquivo: File) => void;
  aoDefinirClasse: (classe: 'rodela' | 'desfiado' | 'espalhado' | 'fio') => void;
  aoSalvar: (params: Record<string, string | number | boolean>, gramas: number, precoKg: number) => void;
  aoExcluir?: () => void;
  salvando?: boolean;
}

export function FichaIngrediente({
  prefixo,
  item,
  cfg,
  geometrias,
  catalogo,
  receitaCampos,
  renderCampos,
  flags,
  valor,
  guardar,
  numero,
  novo = false,
  nome,
  aoMudarNome,
  modeloUrl,
  texturaUrl,
  imagemUrl,
  arquivosNovos,
  aoEnviarArquivo,
  aoDefinirClasse,
  aoSalvar,
  aoExcluir,
  salvando = false,
}: Props) {
  const chave = (campo: string) => `${prefixo}:${campo}`;
  const doServidor = (campo: string) => String(cfg?.params?.[campo] ?? '');
  const classeAtual = valor(chave('classe'), item.classe);
  const tipoAtual = valor(chave('tipo'), doServidor('tipo') || 'disco');
  const usaModelo = Boolean(modeloUrl) && valor(chave('modelo'), String(cfg?.params?.modelo ?? false)) === 'true';
  const geoAtual = catalogo.get(tipoAtual);

  const paramsEfetivos: Record<string, unknown> = { ...((cfg?.params ?? {}) as Record<string, unknown>) };
  for (const campo of [...receitaCampos, ...renderCampos]) {
    const bruto = valor(chave(campo.nome), String(cfg?.params?.[campo.nome] ?? ''));
    if (bruto === '') continue;
    paramsEfetivos[campo.nome] = CAMPOS_TAXA.has(campo.nome) ? bruto : Number(String(bruto).replace(',', '.'));
  }
  for (const [flag] of flags) {
    paramsEfetivos[flag] = valor(chave(flag), String(cfg?.params?.[flag] ?? false)) === 'true';
  }

  const receitaVisivel = receitaCampos
    .map((c) => (c.nome === 'tipo' ? { ...c, opcoes: geometrias.map((g) => ({ valor: g.tipo, rotulo: g.rotulo })) } : c))
    .filter((c) => c.nome === 'tipo' || c.nome === 'padrao' || (geoAtual?.medidas ?? []).includes(c.nome));

  const renderVisivel = renderCampos.filter((c) => {
    if (c.nome === 'pecas') return tipoAtual !== 'fios';
    if (c.nome === 'porcao') return tipoAtual === 'fios';
    if (c.nome === 'faixas') return tipoAtual === 'rodela' || tipoAtual === 'disco' || tipoAtual === 'discoFoto';
    if (c.nome === 'repeticao') return tipoAtual === 'fios' || tipoAtual === 'fio';
    return true;
  });

  const enviar = () => {
    const params: Record<string, string | number | boolean> = { ...((cfg?.params ?? {}) as Record<string, string | number | boolean>), tipo: tipoAtual };
    for (const campo of [...receitaCampos, ...renderCampos]) {
      const bruto = valor(chave(campo.nome), String(cfg?.params?.[campo.nome] ?? ''));
      if (bruto === '') continue;
      if (CAMPOS_TAXA.has(campo.nome)) params[campo.nome] = bruto;
      else {
        const n = Number(bruto.replace(',', '.'));
        if (!Number.isNaN(n)) params[campo.nome] = n;
      }
    }
    for (const [flag] of flags) {
      params[flag] = valor(chave(flag), String(cfg?.params?.[flag] ?? false)) === 'true';
    }
    const gramas = Number(valor(chave('gramas'), item.gramas));
    const precoKg = numero(valor(chave('kg'), ((item.preco_kg ?? 0) / 100).toFixed(2).replace('.', ',')));
    aoSalvar(params, gramas, precoKg);
  };

  return (
    <div className="pedido-detalhe">
      <header className="pedido-detalhe__topo">
        <div>
          <span className="nota">ingrediente</span>
          <h2>{novo ? nome || 'Novo ingrediente' : item.nome}</h2>
        </div>
        {!novo && <strong className="pedido-detalhe__total">{brl(item.preco)}</strong>}
      </header>

      {novo && (
        <div className="campo-grupo__linha campo-grupo">
          <label className="campo-rotulo">Nome</label>
          <input className="campo" placeholder="Tomate seco" value={nome} onChange={(e) => aoMudarNome(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
        <img
          src={imagemUrl ?? arquivosNovos?.imagem ?? item.imagem ?? miniatura(item.id || 'novo')}
          alt={item.nome}
          width={64}
          height={64}
          style={{ borderRadius: 10 }}
        />
        {modeloUrl && /\.stl($|\?)/i.test(modeloUrl) ? (
          <PreviaSTL url={modeloUrl} lado={110} />
        ) : (
          <span className="nota">
            {modeloUrl ? modeloUrl.split('/').pop() : arquivosNovos?.modelo ? arquivosNovos.modelo : 'sem peça 3D enviada'}
          </span>
        )}
        {texturaUrl && (
          <img
            src={texturaUrl}
            alt="textura atual"
            title={texturaUrl.split('/').pop()}
            width={48}
            height={48}
            style={{ borderRadius: 8, border: '1px solid var(--linha)', objectFit: 'cover' }}
          />
        )}
      </div>

      <PreviaIngrediente id={item.id} classe={classeAtual} params={paramsEfetivos} />

      <div style={grupo}>como cai na pizza</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.1rem 0 0.2rem' }}>
        {CLASSES.map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            className={['chip', classeAtual === id ? 'chip--ativo' : ''].join(' ').trim()}
            onClick={() => {
              guardar(chave('classe'), id);
              aoDefinirClasse(id);
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <p className="nota" style={{ margin: '0 0 0.2rem' }}>
        Deposição: como as peças são distribuídas na pizza (rodelas em fileira, flocos desfiados, peças
        espalhadas, fio contínuo).
      </p>

      <div style={grupo}>geometria da peça</div>

      {usaModelo ? (
        <p className="nota" style={{ margin: '0.1rem 0 0.4rem' }}>
          A geometria vem do arquivo enviado ({modeloUrl?.split('/').pop()}). Ajuste escala, cor e densidade abaixo.
        </p>
      ) : (
        receitaVisivel.map((campo) => (
          <CampoDoRender
            key={campo.nome}
            campo={campo}
            valor={valor(chave(campo.nome), doServidor(campo.nome))}
            aoMudar={(v) => {
              guardar(chave(campo.nome), v);
              if (campo.nome !== 'tipo') return;
              for (const [medida, padrao] of Object.entries(catalogo.get(v)?.valores ?? {})) {
                if (valor(chave(medida), '') === '') guardar(chave(medida), String(padrao));
              }
            }}
          />
        ))
      )}

      <div style={grupo}>renderização</div>

      {renderVisivel.map((campo) => (
        <CampoDoRender
          key={campo.nome}
          campo={campo}
          valor={valor(chave(campo.nome), doServidor(campo.nome))}
          aoMudar={(v) => {
            guardar(chave(campo.nome), v);
            if (campo.nome === 'cor') guardar(chave('tinta'), 'true');
          }}
        />
      ))}

      <div className="campo-grupo__linha campo-grupo">
        <label className="campo-rotulo">Textura</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {texturaUrl ? (
            <img src={texturaUrl} alt="textura" width={44} height={44} style={{ borderRadius: 8, border: '1px solid var(--linha)' }} />
          ) : (
            <span className="nota">{arquivosNovos?.textura ?? 'nenhuma'}</span>
          )}
          <span className="nota">{texturaUrl ? texturaUrl.split('/').pop() : 'procedural (sem arquivo)'}</span>
        </div>
      </div>

      {usaModelo && (
        <div className="campo-grupo" style={{ margin: '0.2rem 0 0.4rem' }}>
          <label className="campo-rotulo" htmlFor={`textura-origem-${prefixo}`}>
            Textura na peça
          </label>
          <select
            id={`textura-origem-${prefixo}`}
            className="campo"
            value={
              valor(chave('materialArquivo'), String(cfg?.params?.materialArquivo ?? false)) === 'true'
                ? 'arquivo'
                : valor(chave('textura'), String(cfg?.params?.textura ?? false)) === 'true'
                  ? 'enviada'
                  : 'procedural'
            }
            onChange={(e) => {
              const escolha = e.target.value;
              guardar(chave('materialArquivo'), escolha === 'arquivo' ? 'true' : 'false');
              guardar(chave('textura'), escolha === 'enviada' ? 'true' : 'false');
            }}
          >
            <option value="arquivo">Do arquivo 3D (embutida no modelo)</option>
            <option value="enviada">Textura enviada para este ingrediente</option>
            <option value="procedural">Textura procedural (gerada)</option>
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.15rem 0 0.35rem' }}>
        {flags
          .filter(([flag]) => !(usaModelo && (flag === 'textura' || flag === 'materialArquivo')))
          .map(([flag, rotulo]) => {
            const ligado = valor(chave(flag), String(cfg?.params?.[flag] ?? false)) === 'true';
            const semArquivo =
              (flag === 'modelo' && !modeloUrl) || (flag === 'textura' && !texturaUrl);
            return (
              <button
                key={flag}
                type="button"
                className={['chip', ligado ? 'chip--ativo' : ''].join(' ').trim()}
                disabled={semArquivo}
                title={semArquivo ? 'Envie o arquivo primeiro' : rotulo}
                onClick={() => guardar(chave(flag), ligado ? 'false' : 'true')}
              >
                {rotulo}
              </button>
            );
          })}
      </div>

      <div className="campo-grupo__linha campo-grupo">
        <label className="campo-rotulo">Gramas</label>
        <input
          className="campo campo--preco"
          inputMode="numeric"
          value={valor(chave('gramas'), item.gramas)}
          onChange={(e) => guardar(chave('gramas'), e.target.value)}
        />
      </div>

      <div className="campo-grupo__linha campo-grupo">
        <label className="campo-rotulo">R$/kg</label>
        <input
          className="campo campo--preco"
          value={valor(chave('kg'), ((item.preco_kg ?? 0) / 100).toFixed(2).replace('.', ','))}
          onChange={(e) => guardar(chave('kg'), e.target.value)}
        />
      </div>

      <div className="pedido-detalhe__acoes">
        <button type="button" className="botao botao--primario botao--mini" onClick={enviar} disabled={salvando || (novo && nome.trim().length < 2)}>
          {salvando ? 'Salvando…' : novo ? 'Criar ingrediente' : 'Salvar'}
        </button>
        <label className="botao botao--fantasma botao--mini">
          Modelo 3D
          <input
            type="file"
            accept=".stl,.glb,.gltf,.obj,.ply"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) aoEnviarArquivo('modelo', f);
              e.target.value = '';
            }}
          />
        </label>
        <label className="botao botao--fantasma botao--mini">
          Textura
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) aoEnviarArquivo('textura', f);
              e.target.value = '';
            }}
          />
        </label>
        <label className="botao botao--fantasma botao--mini">
          Imagem
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) aoEnviarArquivo('imagem', f);
              e.target.value = '';
            }}
          />
        </label>
        {!novo && aoExcluir && (
          <button type="button" className="botao botao--perigo botao--mini" onClick={aoExcluir}>
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}

export default FichaIngrediente;
export { CLASSES as CLASSES_INGREDIENTE, CAMPOS_TAXA };
