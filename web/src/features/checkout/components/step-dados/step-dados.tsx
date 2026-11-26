import { useEffect, useRef, useState } from 'react';
import { useCheckout } from '../../context/checkout-context';
import { useGetConfig } from '../../../config/hooks/config-api.hooks';
import { geoService, type SugestaoRua } from '../../../../api/services/geo';
import { brl } from '../../../../shared/utils/format';

export const StepDados: React.FC = () => {
  const checkout = useCheckout();
  const { data: config } = useGetConfig();
  const [sugestoes, setSugestoes] = useState<SugestaoRua[]>([]);
  const [sugestoesCep, setSugestoesCep] = useState<SugestaoRua[]>([]);
  // só o campo em foco mostra sugestões: digitar o CEP preenchia a rua e abria as duas listas
  const [focado, setFocado] = useState<'cep' | 'rua' | null>(null);
  // o "apagar foco" com atraso do campo anterior apagava o foco do campo novo:
  // guarda o timer e cancela quando outro campo recebe o foco
  const timerFoco = useRef<number | null>(null);
  const focar = (campo: 'cep' | 'rua') => {
    if (timerFoco.current) window.clearTimeout(timerFoco.current);
    timerFoco.current = null;
    setFocado(campo);
  };
  const desfocar = () => {
    if (timerFoco.current) window.clearTimeout(timerFoco.current);
    timerFoco.current = window.setTimeout(() => setFocado(null), 150);
  };
  const [ativoRua, setAtivoRua] = useState(-1);
  const refRua = useRef<HTMLInputElement | null>(null);
  const refCep = useRef<HTMLInputElement | null>(null);
  const [ativoCep, setAtivoCep] = useState(-1);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [aviso, setAviso] = useState('');

  const { dados } = checkout;

  // distância até a loja, calculada no servidor, assim que o endereço fica completo
  useEffect(() => {
    if (checkout.modo !== 'entrega') {
      checkout.definirDistancia(null);
      return;
    }
    const completo = dados.rua.trim().length > 2 && dados.numero.trim() && dados.bairro.trim() && dados.cep.replace(/\D/g, '').length === 8;
    if (!completo) {
      checkout.definirDistancia(null);
      return;
    }
    let vivo = true;
    const endereco = `${dados.rua}, ${dados.numero} — ${dados.bairro}, ${dados.cep}`;
    const timer = window.setTimeout(() => {
      geoService
        .distancia(endereco)
        .then((d) => {
          if (vivo) checkout.definirDistancia(d);
        })
        .catch(() => {
          if (vivo) checkout.definirDistancia(null);
        });
    }, 500);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout.modo, dados.rua, dados.numero, dados.bairro, dados.cep]);

  useEffect(() => {
    const cep = dados.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    let vivo = true;
    setBuscandoCep(true);
    geoService
      .porCep(cep)
      .then((endereco) => {
        if (!vivo) return;
        checkout.definirDados({ rua: endereco.rua || dados.rua, bairro: endereco.bairro || dados.bairro });
        setAviso('');
      })
      .catch(() => {
        if (vivo) setAviso('CEP não encontrado');
      })
      .finally(() => {
        if (vivo) setBuscandoCep(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.cep]);

  useEffect(() => {
    if (dados.rua.trim().length < 3) {
      setSugestoes([]);
      return;
    }
    let vivo = true;
    const timer = window.setTimeout(() => {
      geoService
        .sugestoes(dados.rua)
        .then((lista) => {
          if (vivo) {
            setSugestoes(lista);
            setAtivoRua(-1);
          }
        })
        .catch(() => void 0);
    }, 350);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
  }, [dados.rua]);

  // CEP digitado por inteiro também abre sugestão (confirma o endereço encontrado)
  useEffect(() => {
    const limpo = dados.cep.replace(/\D/g, '');
    if (limpo.length !== 8) {
      setSugestoesCep([]);
      return;
    }
    let vivo = true;
    const timer = window.setTimeout(() => {
      geoService
        .sugestoes(limpo)
        .then((lista) => {
          if (vivo) {
            setSugestoesCep(lista);
            setAtivoCep(-1);
          }
        })
        .catch(() => void 0);
    }, 350);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
  }, [dados.cep]);

  const escolher = (s: SugestaoRua, origem: 'rua' | 'cep') => {
    checkout.definirDados({ rua: s.rua || dados.rua, bairro: s.bairro || dados.bairro, cep: s.cep || dados.cep });
    if (origem === 'rua') {
      setSugestoes([]);
      setAtivoRua(-1);
    } else {
      setSugestoesCep([]);
      setAtivoCep(-1);
    }
  };

  // setas + Enter escolhem a sugestão sem sair do teclado
  const teclado = (lista: SugestaoRua[], ativo: number, definir: (i: number) => void, origem: 'rua' | 'cep') =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!lista.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        definir(Math.min(lista.length - 1, ativo + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        definir(Math.max(0, ativo - 1));
      } else if (e.key === 'Enter' && ativo >= 0) {
        e.preventDefault();
        escolher(lista[ativo]!, origem);
      } else if (e.key === 'Escape') {
        definir(-1);
        if (origem === 'rua') setSugestoes([]);
        else setSugestoesCep([]);
      }
    };

  // perto do rodapé a lista abre para cima: abrir para baixo cortava na borda da tela
  const abrirAcima = (el: HTMLInputElement | null) =>
    Boolean(el && typeof window !== 'undefined' && el.getBoundingClientRect().bottom > window.innerHeight - 320);

  const listaSugestoes = (lista: SugestaoRua[], ativo: number, origem: 'rua' | 'cep') =>
    lista.length > 0 && focado === origem ? (
      <div
        className="sugestoes"
        role="listbox"
        style={abrirAcima(origem === 'rua' ? refRua.current : refCep.current) ? { top: 'auto', bottom: 'calc(100% + 4px)' } : undefined}
      >
        {lista.map((s, i) => (
          <button
            key={`${s.cep}-${s.rua}-${s.bairro}-${i}`}
            type="button"
            role="option"
            aria-selected={i === ativo}
            className="sugestao"
            style={i === ativo ? { background: '#221f1c' } : undefined}
            onMouseEnter={() => (origem === 'rua' ? setAtivoRua(i) : setAtivoCep(i))}
            onClick={() => escolher(s, origem)}
          >
            <span className="sugestao__rua">{s.rua || s.rotulo}</span>
            <span className="sugestao__extra">
              {[s.bairro, s.cidade, s.cep ? s.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''].filter(Boolean).join(' · ')}
            </span>
          </button>
        ))}
      </div>
    ) : null;

  const campo = (
    rotulo: string,
    valor: string,
    aoMudar: (v: string) => void,
    placeholder: string,
    extra?: React.ReactNode,
  ) => (
    <label className="entrada">
      <span className="entrada__rotulo">{rotulo}</span>
      <input className="entrada__campo" placeholder={placeholder} value={valor} onChange={(e) => aoMudar(e.target.value)} />
      {extra}
    </label>
  );

  return (
    <>
      <section className="etapa__bloco">
        <h3 className="etapa__subtitulo">Como o pedido chega</h3>
        <div className="alternador">
          <button
            type="button"
            className={['alternador__opcao', checkout.modo === 'entrega' ? 'alternador__opcao--ativa' : ''].join(' ').trim()}
            onClick={() => checkout.definirModo('entrega')}
          >
            Entrega · {brl(config?.taxaBase ?? 0)}
          </button>
          <button
            type="button"
            className={['alternador__opcao', checkout.modo === 'retirada' ? 'alternador__opcao--ativa' : ''].join(' ').trim()}
            onClick={() => checkout.definirModo('retirada')}
          >
            Retirar no balcão
          </button>
        </div>
        <p className="etapa__apoio">
          {checkout.modo === 'retirada'
            ? `Você retira na ${config?.enderecoRetirada ?? 'loja'}.`
            : config
              ? `Entregamos em até ${config.raioEntregaKm} km da pizzaria.` +
                (config.freteGratisAcima > 0 ? ` Frete grátis acima de ${brl(config.freteGratisAcima)}.` : '')
              : ''}
        </p>
      </section>

      <section className="etapa__bloco">
        <h3 className="etapa__subtitulo">Seus dados</h3>

        <div className="linha-entradas">
          {campo('Nome de quem recebe', dados.nome, (v) => checkout.definirDados({ nome: v }), 'Maria Souza')}
          {campo('Celular', dados.telefone, (v) => checkout.definirDados({ telefone: v }), '(11) 90000-0000')}
        </div>

        <div className="linha-entradas">
          {campo('E-mail', dados.email, (v) => checkout.definirDados({ email: v }), 'voce@email.com')}
        </div>
        <p className="nota" style={{ fontSize: '0.72rem' }}>
          Preencha celular ou e-mail — precisamos de pelo menos um para avisar sobre o pedido.
        </p>

        {checkout.modo === 'entrega' && (
          <>
            <div className="linha-entradas">
              <label className="entrada entrada--sugestao">
                <span className="entrada__rotulo">CEP</span>
                <input
                  className="entrada__campo"
                  ref={refCep}
                  placeholder="01310-200"
                  inputMode="numeric"
                  value={dados.cep}
                  onChange={(e) => checkout.definirDados({ cep: e.target.value })}
                  onFocus={() => focar('cep')}
                  onBlur={desfocar}
                  onKeyDown={teclado(sugestoesCep, ativoCep, setAtivoCep, 'cep')}
                />
                {listaSugestoes(sugestoesCep, ativoCep, 'cep')}
                <span className="nota" style={{ fontSize: '0.7rem' }}>
                  {buscandoCep ? 'buscando endereço…' : aviso || 'digite o CEP para ver o endereço'}
                </span>
              </label>
              {campo('Complemento', dados.complemento, (v) => checkout.definirDados({ complemento: v }), 'apto 42')}
            </div>

            <div className="linha-entradas linha-entradas--3">
              <label className="entrada entrada--sugestao">
                <span className="entrada__rotulo">Rua</span>
                <input
                  className="entrada__campo"
                  ref={refRua}
                  placeholder="Rua, avenida ou bairro"
                  autoComplete="off"
                  value={dados.rua}
                  onChange={(e) => checkout.definirDados({ rua: e.target.value })}
                  onFocus={() => focar('rua')}
                  onBlur={desfocar}
                  onKeyDown={teclado(sugestoes, ativoRua, setAtivoRua, 'rua')}
                />
                {listaSugestoes(sugestoes, ativoRua, 'rua')}
              </label>
              {campo('Número', dados.numero, (v) => checkout.definirDados({ numero: v }), '512')}
              {campo('Bairro', dados.bairro, (v) => checkout.definirDados({ bairro: v }), 'Vila Madalena')}
            </div>
          </>
        )}
        {checkout.modo === 'entrega' && checkout.distancia && (
          <p className={checkout.distancia.dentro ? 'etapa__distancia' : 'etapa__erro'}>
            {checkout.distancia.dentro
              ? `${checkout.distancia.distanciaKm.toLocaleString('pt-BR')} km da pizzaria — dentro da área de entrega`
              : `Fora da área de entrega: ${checkout.distancia.distanciaKm.toLocaleString('pt-BR')} km (o limite é ${checkout.distancia.raioKm.toLocaleString('pt-BR')} km)`}
          </p>
        )}
      </section>
    </>
  );
};

export const enderecoDe = (checkout: ReturnType<typeof useCheckout>): string | null => {
  if (checkout.modo === 'retirada') return null;
  const { rua, numero, complemento, bairro, cep } = checkout.dados;
  const linha = [rua, numero].filter(Boolean).join(', ');
  return [linha, complemento, bairro, cep].filter(Boolean).join(' — ') || null;
};

export const dadosCompletos = (checkout: ReturnType<typeof useCheckout>): boolean => {
  const { nome, telefone, email, cep, rua, numero, bairro } = checkout.dados;
  const temTelefone = telefone.replace(/\D/g, '').length >= 10;
  const temEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  if (!nome.trim() || (!temTelefone && !temEmail)) return false;
  if (checkout.modo === 'retirada') return true;
  const enderecoOk = Boolean(cep.replace(/\D/g, '').length === 8 && rua.trim() && numero.trim() && bairro.trim());
  // entrega só anda com distância medida e dentro do raio (o servidor recusa de qualquer jeito)
  if (!enderecoOk) return false;
  if (checkout.modo === 'entrega') return checkout.distancia?.dentro === true;
  return true;
};
