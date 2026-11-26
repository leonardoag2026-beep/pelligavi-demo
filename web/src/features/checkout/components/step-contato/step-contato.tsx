import { useState } from 'react';
import { authService } from '../../../../api/services/auth';
import { useCheckout } from '../../context/checkout-context';

/**
 * Confirmação do contato no passo de pagamento — só para quem está deslogado. Se a pessoa
 * informou celular e e-mail, o código vai por SMS (celular primeiro).
 */
export const StepContato: React.FC = () => {
  const checkout = useCheckout();
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const telefone = checkout.dados.telefone.replace(/\D/g, '');
  const email = checkout.dados.email.trim();
  const canal: 'sms' | 'email' = telefone.length >= 10 ? 'sms' : 'email';
  const destino = canal === 'sms' ? telefone : email;

  if (checkout.contatoToken) {
    return (
      <section className="etapa__bloco">
        <h3 className="etapa__subtitulo">Contato confirmado</h3>
        <p className="etapa__apoio">
          Confirmamos {canal === 'sms' ? `o celular ${checkout.dados.telefone}` : `o e-mail ${email}`}. Pode pagar.
        </p>
      </section>
    );
  }

  const confirmarCom = async (valor: string) => {
    setErro('');
    try {
      const data = await authService.confirmarContato(destino, valor);
      checkout.definirContato(data.tokenContato);
      setAviso('');
      return true;
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Código incorreto.');
      return false;
    }
  };

  const enviar = async () => {
    setErro('');
    setEnviando(true);
    try {
      const data = await authService.codigoContato(destino);
      setAviso(data.codigo ? `modo demonstração — seu código é ${data.codigo}` : 'código enviado');
      if (data.codigo) setCodigo(data.codigo);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Não foi possível enviar o código.');
    } finally {
      setEnviando(false);
    }
  };

  // não há SMS real na demo: este botão pede o código e confirma em um clique
  const preencher = async () => {
    setErro('');
    setEnviando(true);
    try {
      const data = await authService.codigoContato(destino);
      if (!data.codigo) {
        setAviso('código enviado — confira o SMS');
        return;
      }
      setCodigo(data.codigo);
      await confirmarCom(data.codigo);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Não foi possível confirmar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="etapa__bloco">
      <h3 className="etapa__subtitulo">Confirme o seu contato</h3>
      <p className="etapa__apoio">
        {canal === 'sms'
          ? `Mandamos um código por SMS para ${checkout.dados.telefone}.`
          : `Mandamos um código por e-mail para ${email}.`}
      </p>

      <div className="linha-entradas">
        <label className="entrada">
          <span className="entrada__rotulo">Código de 6 dígitos</span>
          <input
            className="entrada__campo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            autoComplete="one-time-code"
          />
        </label>
        <div style={{ alignSelf: 'end', display: 'flex', gap: 8, paddingBottom: 2, flexWrap: 'wrap' }}>
          <button type="button" className="botao botao--vidro botao--mini" disabled={enviando} onClick={enviar}>
            Enviar código
          </button>
          <button type="button" className="botao botao--primario botao--mini" disabled={enviando || codigo.length !== 6} onClick={() => confirmarCom(codigo)}>
            Confirmar
          </button>
          <button type="button" className="botao botao--fantasma botao--mini" disabled={enviando} onClick={preencher}>
            Preencher automaticamente
          </button>
        </div>
      </div>

      {aviso && <p className="nota" style={{ fontSize: '0.72rem' }}>{aviso}</p>}
      {erro && <p className="nota" style={{ fontSize: '0.72rem', color: '#e08a7a' }}>{erro}</p>}
    </section>
  );
};

export default StepContato;
