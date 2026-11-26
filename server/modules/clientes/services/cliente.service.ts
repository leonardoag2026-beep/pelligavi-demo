import { NaoEncontradoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import clienteRepository, { type ClienteLinha } from '../repositories/cliente.repository.js';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  enderecos: string[];
  criadoEm: number;
  anonimizado: boolean;
  anonimizadoEm?: number | null;
}

const montar = (linha: ClienteLinha): Cliente => ({
  id: `c${linha.id}`,
  nome: linha.nome,
  telefone: linha.telefone,
  enderecos: linha.enderecos,
  criadoEm: new Date(linha.criadoEm).getTime(),
  anonimizado: linha.anonimizado,
});

const numeroDoId = (id: string): number => {
  const numero = Number(String(id).replace(/^c/, ''));
  if (!Number.isInteger(numero) || numero <= 0) throw new ValidacaoError(`Cliente ${id} inválido`);
  return numero;
};

const ROTULO = 'Cliente anonimizado';

export const clienteService = {
  listar: async (busca?: string): Promise<Cliente[]> => {
    const linhas = await clienteRepository.listar(busca);
    return linhas.map(montar);
  },

  porId: async (id: string): Promise<Cliente> => {
    const linha = await clienteRepository.porId(numeroDoId(id));
    if (!linha) throw new NaoEncontradoError(`Cliente ${id} não encontrado`);
    return montar(linha);
  },

  criar: async (dados: { nome: string; telefone: string | null; enderecos: string[] }): Promise<Cliente> => {
    const nome = dados.nome.trim();
    if (!nome) throw new ValidacaoError('Nome é obrigatório');
    const id = await clienteRepository.criar({ nome, telefone: dados.telefone, enderecos: dados.enderecos });
    const criado = await clienteRepository.porId(id);
    if (!criado) throw new NaoEncontradoError('Cliente criado não encontrado');
    return montar(criado);
  },

  atualizar: async (id: string, dados: { nome: string; telefone: string | null; enderecos: string[] }): Promise<Cliente> => {
    const numero = numeroDoId(id);
    const atual = await clienteRepository.porId(numero);
    if (!atual) throw new NaoEncontradoError(`Cliente ${id} não encontrado`);
    await clienteRepository.atualizar(numero, { nome: dados.nome.trim(), telefone: dados.telefone, enderecos: dados.enderecos });
    return clienteService.porId(id);
  },

  // checkout: reaproveita o cliente pelo telefone; se não existir, cria
  doCheckout: async (dados: { nome: string; telefone: string | null; endereco: string | null }): Promise<Cliente> => {
    const existente = dados.telefone ? await clienteRepository.porTelefone(dados.telefone) : null;

    if (!existente) {
      return clienteService.criar({
        nome: dados.nome,
        telefone: dados.telefone,
        enderecos: dados.endereco ? [dados.endereco] : ['Retirada no balcão'],
      });
    }

    const enderecos = dados.endereco && !existente.enderecos.includes(dados.endereco)
      ? [...existente.enderecos, dados.endereco]
      : existente.enderecos;

    return clienteService.atualizar(`c${existente.id}`, {
      nome: existente.anonimizado ? dados.nome : existente.nome,
      telefone: existente.telefone,
      enderecos,
    });
  },

  anonimizar: async (id: string): Promise<Cliente> => {
    const numero = numeroDoId(id);
    const alvo = await clienteRepository.porId(numero);
    if (!alvo) throw new NaoEncontradoError(`Cliente ${id} não encontrado`);
    const rotulo = `${ROTULO} ${String(numero).padStart(4, '0')}`;
    await clienteRepository.anonimizar(numero, rotulo);
    return clienteService.porId(id);
  },

  total: async (): Promise<number> => (await clienteRepository.total())?.total ?? 0,
};

export default clienteService;
