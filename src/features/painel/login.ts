import { el, toast } from '../../shared/ui/dom.js';
import { login, garantirGerente, CREDENCIAL_PADRAO } from '../../api/services/auth.service.js';
import { marca } from '../../shared/ui/marca.js';

export const renderLogin = (alvo: any, { aoEntrar, aoCancelar }: { aoEntrar?: () => void; aoCancelar?: () => void } = {}) => {
  const email = el('input', { class: 'campo', type: 'email', value: CREDENCIAL_PADRAO.email, autocomplete: 'username' });
  const senha = el('input', { class: 'campo', type: 'password', value: '', placeholder: 'sua senha', autocomplete: 'current-password' });
  const erro = el('span', { class: 'campo-erro' });
  const botao = el('button', { type: 'submit', class: 'botao botao--primario botao--grande' }, 'Entrar');

  const enviar = async (evento: any) => {
    evento.preventDefault();
    erro.textContent = '';
    botao.disabled = true;
    try {
      await garantirGerente();
      const ok = await login(email.value, senha.value);
      if (!ok) {
        erro.textContent = 'Login ou senha incorretos.';
        return;
      }
      toast('Bem-vindo de volta');
      aoEntrar?.();
      // os dados do painel são carregados no boot, agora que o cookie existe
      window.location.hash = '#painel';
      window.location.reload();
    } catch (e) {
      erro.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      botao.disabled = false;
    }
  };

  alvo.append(
    el('div', { class: 'login' }, [
      el('form', { class: 'login__cartao', onsubmit: enviar }, [
        el('div', { class: 'login__marca' }, marca({ horizontal: true })),
        el('h1', {}, 'Área do gerente'),
        el('p', { class: 'nota' }, 'Todas as telas do painel exigem login do gerente: pedidos, cozinha, cardápio, clientes, relatórios, caixa e configurações.'),
        el('label', { class: 'campo-grupo' }, [el('span', { class: 'campo-rotulo' }, 'Login'), email]),
        el('label', { class: 'campo-grupo' }, [el('span', { class: 'campo-rotulo' }, 'Senha'), senha]),
        erro,
        botao,
        el('p', { class: 'login__dica' }, [
          el('span', { class: 'nota' }, 'Demo: '),
          el('code', {}, `${CREDENCIAL_PADRAO.email} / ${CREDENCIAL_PADRAO.senha}`),
        ]),
        aoCancelar
          ? el('button', { type: 'button', class: 'botao botao--discreto botao--mini', onclick: aoCancelar }, 'Voltar para o atendimento')
          : null,
      ]),
    ])
  );
};
