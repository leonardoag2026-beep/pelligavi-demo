import { randomInt } from 'node:crypto';
import { ConflitoError, NaoAutorizadoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import { assinar, verificar } from '../../../shared/security/jwt.js';
import codigoRepository from '../repositories/codigo.repository.js';
import contaClienteRepository from '../repositories/conta-cliente.repository.js';

const MINUTOS = 10;
const MAX_TENTATIVAS = 5;

// o envio é simulado: não existe provedor de e-mail nem gateway de SMS na demo. O código
// vai para o log do server e volta na resposta enquanto OTP_MOCK não estiver desligado
const MOCK = () => process.env.OTP_MOCK !== 'off';

export interface Destino {
  destino: string;
  canal: 'email' | 'sms';
}

export const normalizarDestino = (bruto: string): Destino => {
  const texto = String(bruto || '').trim();
  if (!texto) throw new ValidacaoError('Informe o e-mail ou o celular');
  if (texto.includes('@')) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto)) throw new ValidacaoError('E-mail inválido');
    return { destino: texto.toLowerCase(), canal: 'email' };
  }
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 13) throw new ValidacaoError('Celular inválido — informe DDD e número');
  return { destino: digitos, canal: 'sms' };
};

const enviar = async (bruto: string, proposito: 'login' | 'contato') => {
  const { destino, canal } = normalizarDestino(bruto);
  const codigo = String(randomInt(100000, 1000000));
  // faxina barata: sem isso a tabela de códigos cresce para sempre
  await codigoRepository.limparAntigos().catch(() => undefined);
  await codigoRepository.criar({ destino, canal, codigo, proposito, minutos: MINUTOS });
  console.log(`[otp:mock] ${proposito} ${canal} -> ${destino}: ${codigo}`);
  return {
    ok: true,
    canal,
    destino,
    expiraEmMinutos: MINUTOS,
    // demo: sem provedor real, o código volta para a tela. Em produção, sai do payload.
    ...(MOCK() ? { codigo } : {}),
  };
};

const conferir = async (bruto: string, codigo: string, proposito: 'login' | 'contato', consumir: boolean) => {
  const { destino, canal } = normalizarDestino(bruto);
  const ativo = await codigoRepository.ativo(destino, proposito);
  if (!ativo) throw new NaoAutorizadoError('Código expirado. Peça um novo');
  if (ativo.tentativas >= MAX_TENTATIVAS) {
    await codigoRepository.marcarUsado(ativo.id);
    throw new NaoAutorizadoError('Muitas tentativas. Peça um novo código');
  }
  if (String(codigo || '').trim() !== ativo.codigo) {
    await codigoRepository.contarTentativa(ativo.id);
    throw new NaoAutorizadoError('Código incorreto');
  }
  if (consumir) await codigoRepository.marcarUsado(ativo.id);
  return { destino, canal };
};

const sessaoDe = (cliente: { id: number; nome: string; email: string | null; telefone: string | null }) => {
  const { token } = assinar({ sub: String(cliente.id), nome: cliente.nome });
  return {
    token,
    cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone },
  };
};

export const otpService = {
  // ---- login do cliente -------------------------------------------------
  enviarLogin: (destino: string) => enviar(destino, 'login'),

  entrar: async (destinoBruto: string, codigo: string) => {
    // não consome ainda: se a conta não existir, o mesmo código serve para o registro
    const { destino, canal } = await conferir(destinoBruto, codigo, 'login', false);
    const cliente = await contaClienteRepository.porDestino(destino, canal);
    if (!cliente) {
      // código válido, mas ainda não existe conta: a tela pede o nome
      return { precisaCadastro: true as const, destino, canal };
    }
    // conta existe: agora sim o código é gasto
    await conferir(destinoBruto, codigo, 'login', true);
    await contaClienteRepository.marcarVerificado(cliente.id, canal);
    return { precisaCadastro: false as const, ...sessaoDe(cliente) };
  },

  registrar: async (dados: { nome: string; destino: string; codigo: string }) => {
    const nome = String(dados.nome || '').trim();
    if (nome.length < 2) throw new ValidacaoError('Informe o seu nome');
    const { destino, canal } = await conferir(dados.destino, dados.codigo, 'login', true);
    const existente = await contaClienteRepository.porDestino(destino, canal);
    if (existente) throw new ConflitoError('Já existe uma conta com este contato');
    const cliente = await contaClienteRepository.criarPorDestino({ nome, destino, canal });
    return sessaoDe(cliente);
  },

  sessao: async (id: number) => {
    const cliente = await contaClienteRepository.porId(id);
    if (!cliente) throw new NaoAutorizadoError('Conta não encontrada');
    return { cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone } };
  },

  // ---- confirmação de contato antes de pagar ----------------------------
  enviarContato: (destino: string) => enviar(destino, 'contato'),

  confirmarContato: async (destinoBruto: string, codigo: string) => {
    const { destino, canal } = await conferir(destinoBruto, codigo, 'contato', true);
    const { token } = assinar({ sub: destino, nome: 'contato' });
    return { ok: true, destino, canal, tokenContato: token };
  },

  // o pedido só é aceito com um token de contato válido
  contatoValido: (token: string | null | undefined): string | null => {
    const payload = verificar(token);
    return payload && payload.nome === 'contato' ? payload.sub : null;
  },
};

export default otpService;
