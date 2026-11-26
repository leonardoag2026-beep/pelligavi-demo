export class AppError extends Error {
  readonly status: number;
  readonly codigo: string;

  constructor(mensagem: string, status = 400, codigo = 'erro') {
    super(mensagem);
    this.name = new.target.name;
    this.status = status;
    this.codigo = codigo;
  }
}

export class NaoEncontradoError extends AppError {
  constructor(mensagem = 'Registro não encontrado') {
    super(mensagem, 404, 'nao_encontrado');
  }
}

export class ValidacaoError extends AppError {
  constructor(mensagem = 'Dados inválidos') {
    super(mensagem, 422, 'validacao');
  }
}

export class NaoAutorizadoError extends AppError {
  constructor(mensagem = 'Não autorizado') {
    super(mensagem, 401, 'nao_autorizado');
  }
}

export class ConflitoError extends AppError {
  constructor(mensagem = 'Registro em conflito') {
    super(mensagem, 409, 'conflito');
  }
}
