import { um } from '../../../config/db.js';
import { NaoAutorizadoError } from '../../../shared/errors/app-error.js';
import { assinar } from '../../../shared/security/jwt.js';
import { conferirSenha } from '../../../shared/security/senha.js';
import gerenteRepository from '../repositories/gerente.repository.js';
import contaClienteRepository from '../repositories/conta-cliente.repository.js';
import { gerarHash, senhaForte } from '../../../shared/security/senha.js';
import { ConflitoError, ValidacaoError } from '../../../shared/errors/app-error.js';

export interface SessaoGerente {
  token: string;
  gerente: { id: number; nome: string; email: string };
}

export const authService = {
  login: async (email: string, senha: string): Promise<SessaoGerente> => {
    const gerente = await gerenteRepository.porEmail(email);
    if (!gerente || !conferirSenha(senha, gerente.senhaHash)) {
      throw new NaoAutorizadoError('E-mail ou senha incorretos');
    }
    const { token } = assinar({ sub: String(gerente.id), nome: gerente.nome });
    // manutenção: apaga sessões vencidas ou revogadas (a function vive no banco)
    await um<{ limpas: number }>('SELECT limpar_sessoes_vencidas() AS limpas').catch(() => null);
    return { token, gerente: { id: gerente.id, nome: gerente.nome, email: gerente.email } };
  },

  sessao: async (id: number): Promise<{ gerente: { id: number; nome: string; email: string } }> => {
    const gerente = await gerenteRepository.porId(id);
    if (!gerente) throw new NaoAutorizadoError('Gerente não encontrado');
    return { gerente: { id: gerente.id, nome: gerente.nome, email: gerente.email } };
  },
};

export interface SessaoCliente {
  token: string;
  cliente: { id: number; nome: string; email: string | null; telefone: string | null };
}

export const contaService = {
  registrar: async (dados: { nome: string; email: string; telefone?: string | null; senha: string }): Promise<SessaoCliente> => {
    if (!dados.nome?.trim()) throw new ValidacaoError('Informe o seu nome');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email || '')) throw new ValidacaoError('E-mail inválido');
    if (!senhaForte(dados.senha)) throw new ValidacaoError('A senha precisa de 6 a 72 caracteres');

    const existente = await contaClienteRepository.porEmail(dados.email);
    if (existente) throw new ConflitoError('Já existe uma conta com este e-mail');

    const id = await contaClienteRepository.criar({
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      telefone: dados.telefone?.trim() || null,
      senhaHash: gerarHash(dados.senha),
    });

    const { token } = assinar({ sub: String(id), nome: dados.nome.trim() });
    return {
      token,
      cliente: { id, nome: dados.nome.trim(), email: dados.email.trim(), telefone: dados.telefone?.trim() || null },
    };
  },

  login: async (email: string, senha: string): Promise<SessaoCliente> => {
    const cliente = await contaClienteRepository.porEmail(email);
    if (!cliente || !conferirSenha(senha, cliente.senhaHash)) {
      throw new NaoAutorizadoError('E-mail ou senha incorretos');
    }
    const { token } = assinar({ sub: String(cliente.id), nome: cliente.nome });
    return {
      token,
      cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone },
    };
  },

  sessao: async (id: number) => {
    const cliente = await contaClienteRepository.porId(id);
    if (!cliente) throw new NaoAutorizadoError('Conta não encontrada');
    return { cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone } };
  },
};

export default authService;
