import { SITE } from '../../shared/config/site.js';
import { brl } from '../../shared/format/format.js';
import { el } from '../../shared/ui/dom.js';
import { cobranca, garantirCobranca, baixarCobranca } from '../../api/services/payment.service.js';
import { porNumero } from '../../api/services/orders.service.js';

export const renderPix = (alvo: any, token: any) => {
  const tela = el('div', { class: 'psp' });

  const desenhar = () => {
    tela.innerHTML = '';
    const atual = cobranca(token);
    if (!atual) {
      tela.append(
        el('div', { class: 'psp__cartao' }, [
          el('span', { class: 'psp__marca' }, SITE.nome),
          el('h1', {}, 'Cobrança não encontrada'),
          el('p', { class: 'nota' }, 'Este link de pagamento foi aberto em outro navegador ou a cobrança já expirou.'),
          el('a', { class: 'botao botao--primario botao--largo', href: './' }, 'Voltar para a loja'),
        ])
      );
      return;
    }
    const pago = atual.status === 'pago';
    tela.append(
      el('div', { class: `psp__cartao ${pago ? 'psp__cartao--pago' : ''}` }, [
        el('span', { class: 'psp__marca' }, `PIX · ${SITE.nome}`),
        el('h1', {}, pago ? 'Pagamento confirmado' : 'Confirme o pagamento'),
        el('p', { class: 'psp__valor' }, brl(atual.valor)),
        el('p', { class: 'nota' }, pago
          ? `Pedido ${porNumero(Number(atual.pedidoId?.replace('FDV-', '') || 0))?.id || atual.pedidoId || ''} registrado. Pode fechar esta página.`
          : `Cobrança ${atual.id.toUpperCase()} · ${atual.itens.length} ${atual.itens.length === 1 ? 'item' : 'itens'}`),
        pago
          ? el('a', { class: 'botao botao--fantasma botao--largo', href: './' }, 'Voltar para a loja')
          : el('button', {
              type: 'button', class: 'botao botao--primario botao--largo',
              onclick: async (e: any) => {
                e.currentTarget.disabled = true;
                e.currentTarget.textContent = 'Confirmando…';
                const r = await baixarCobranca(token, 'pix');
                if (r.ok) desenhar();
              },
            }, 'Confirmar pagamento'),
        el('p', { class: 'psp__rodape' }, 'Ambiente de demonstração: nenhum valor é cobrado de verdade.')
      ])
    );
  };

  alvo.append(el('div', { class: 'psp__fundo' }, [tela]));
  tela.append(el('p', { class: 'nota' }, 'Abrindo cobrança…'));
  // a cobrança é pública: vem da API pelo código, sem depender do cache do painel
  void garantirCobranca(String(token)).then(() => desenhar()).catch(() => desenhar());
};
