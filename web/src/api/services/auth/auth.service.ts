import api from '../../axiosInstance';
import type {
  ContaCliente,
  LoginClienteRequest,
  LoginGerenteRequest,
  LoginResponse,
  RegistroClienteRequest,
} from './types';

export const authService = {
  loginGerente: async (body: LoginGerenteRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/gerente', body);
    return response.data;
  },

  sessaoGerente: async (): Promise<LoginResponse> => {
    const response = await api.get<LoginResponse>('/api/auth/gerente');
    return response.data;
  },

  sairGerente: async (): Promise<void> => {
    await api.post('/api/auth/sair');
  },

  // login do cliente agora é por código: e-mail ou celular, sem senha
  sessaoCliente: async (): Promise<{ cliente: ContaCliente }> => {
    const response = await api.get<{ cliente: ContaCliente }>('/api/auth/cliente');
    return response.data;
  },

  codigoGerente: (destino: string) => api.post('/api/auth/gerente/codigo', { destino }).then((r) => r.data),
  loginGerenteCodigo: async (destino: string, codigo: string): Promise<{ gerente: any }> => {
    const r = await api.post('/api/auth/gerente/entrar', { destino, codigo });
    return r.data;
  },

  codigoCliente: (destino: string) => api.post('/api/auth/cliente/codigo', { destino }).then((r) => r.data),
  entrarCliente: (destino: string, codigo: string) => api.post('/api/auth/cliente/entrar', { destino, codigo }).then((r) => r.data),
  registrarClienteOtp: (nome: string, destino: string, codigo: string) =>
    api.post('/api/auth/cliente/registro', { nome, destino, codigo }).then((r) => r.data),

  loginCliente: async (body: LoginClienteRequest): Promise<{ conta: ContaCliente }> => {
    const response = await api.post<{ conta: ContaCliente }>('/api/auth/login', body);
    return response.data;
  },

  registrarCliente: async (body: RegistroClienteRequest): Promise<{ conta: ContaCliente }> => {
    const response = await api.post<{ conta: ContaCliente }>('/api/auth/registro', body);
    return response.data;
  },

  // confirmação do contato antes de pagar
  codigoContato: (destino: string) => api.post('/api/auth/contato/codigo', { destino }).then((r) => r.data),
  confirmarContato: (destino: string, codigo: string) => api.post('/api/auth/contato/confirmar', { destino, codigo }).then((r) => r.data),
};

export default authService;
