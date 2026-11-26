import { el, toast } from '../../shared/ui/dom.js';
import { contaAtual, entrar, cadastrar, identificadorValido } from '../../api/services/account.service.js';

const ICONE = `<svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M24 4 6 11v12c0 11 7.4 17.6 18 21 10.6-3.4 18-10 18-21V11L24 4z"/>
  <rect x="17" y="21" width="14" height="11" rx="2.4"/>
  <path d="M20 21v-3a4 4 0 0 1 8 0v3"/>
</svg>`;

export const abrirAuth = ({ aoAtualizar }: { aoAtualizar?: () => void } = {}) => {
  let modo = contaAtual() ? 'entrar' : 'entrar';
  const raiz = el('div', { class: 'auth' });
  const corpo = el('div', { class: 'auth__corpo' });

  const fechar = () => {
    raiz.classList.remove('auth--aberto');
    setTimeout(() => raiz.remove(), 220);
    aoAtualizar?.();
  };

  const desenhar = () => {
    corpo.innerHTML = '';
    const criando = modo === 'cadastro';
    const erro = el('p', { class: 'auth__erro' });

    const nome = el('input', { class: 'auth__campo', placeholder: 'Nome completo', autocomplete: 'name' });
    const identificador = el('input', {
      class: 'auth__campo',
      placeholder: criando ? 'E-mail ou celular' : 'E-mail ou celular',
      autocomplete: 'username',
    });
    const senha = el('input', {
      class: 'auth__campo', type: 'password',
      placeholder: criando ? 'Crie uma senha' : 'Senha',
      autocomplete: criando ? 'new-password' : 'current-password',
    });

    const enviar = async (evento: any) => {
      evento.preventDefault();
      erro.textContent = '';
      if (!identificadorValido(identificador.value)) {
        erro.textContent = 'Informe um e-mail válido ou um celular com DDD.';
        return;
      }
      if (senha.value.trim().length < 4) {
        erro.textContent = 'A senha precisa de pelo menos 4 caracteres.';
        return;
      }
      const resultado = criando
        ? await cadastrar({ nome: nome.value, identificador: identificador.value, senha: senha.value })
        : await entrar({ identificador: identificador.value, senha: senha.value });
      if (!resultado.ok) {
        erro.textContent = resultado.erro || 'Não foi possível entrar';
        return;
      }
      toast(criando ? 'Conta criada' : 'Bem-vindo de volta');
      fechar();
    };

    corpo.append(
      el('header', { class: 'auth__topo' }, [
        el('button', { type: 'button', class: 'auth__icone', onclick: fechar, 'aria-label': 'Voltar' }, '‹'),
        el('span', { class: 'auth__menu' }, '☰'),
      ]),
      el('h1', { class: 'auth__titulo' }, criando ? 'CRIAR CONTA' : 'ENTRAR'),
      el('form', { class: 'auth__folha', onsubmit: enviar }, [
        el('div', { class: 'auth__escudo' }, el('span', { html: ICONE })),
        el('h2', { class: 'auth__chamada' }, criando ? 'Bem-vindo à Pelligavi' : 'Problemas para fazer login?'),
        el('p', { class: 'auth__texto' },
          criando
            ? 'Crie sua conta para acompanhar pedidos, repetir a última pizza e guardar seus endereços.'
            : 'Entre com seu e-mail ou celular para ver seus pedidos e finalizar a compra mais rápido.'),
        criando ? nome : null,
        identificador,
        senha,
        erro,
        el('button', { type: 'submit', class: 'auth__acao' }, criando ? 'Criar conta' : 'Entrar'),
        el('button', {
          type: 'button', class: 'auth__link',
          onclick: () => { modo = criando ? 'entrar' : 'cadastro'; desenhar(); },
        }, criando ? 'Já tenho conta' : 'Criar uma conta'),
        !criando
          ? el('button', {
              type: 'button', class: 'auth__link',
              onclick: async () => {
                const r = await entrar({ identificador: 'mariana@email.com', senha: '123456' });
                if (!r.ok) { erro.textContent = 'Conta de exemplo indisponível — reinicie o demo.'; return; }
                toast('Bem-vindo de volta');
                fechar();
              },
            }, 'Entrar na conta de exemplo')
          : null,
      ]),
      el('button', {
        type: 'button', class: 'auth__rodape',
        onclick: () => { modo = criando ? 'entrar' : 'cadastro'; desenhar(); },
      }, criando ? 'Voltar para a página de login' : 'Ainda não tem conta? Cadastre-se')
    );
  };

  raiz.append(corpo);
  document.body.append(raiz);
  requestAnimationFrame(() => raiz.classList.add('auth--aberto'));
  desenhar();

  raiz.addEventListener('click', (evento) => { if (evento.target === raiz) fechar(); });
  document.addEventListener('keydown', function esc(ev) {
    if (ev.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); }
  });
};
