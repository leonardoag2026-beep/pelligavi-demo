import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

interface CorpoErro {
  erro: string;
  codigo: string;
  detalhes?: unknown;
}

export const erroMiddleware = (
  erro: unknown,
  _req: Request,
  res: Response,
  _proxima: NextFunction,
): Response<CorpoErro> => {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message, codigo: erro.codigo });
  }

  if (erro instanceof ZodError) {
    return res.status(422).json({
      erro: 'Dados inválidos',
      codigo: 'validacao',
      detalhes: erro.issues.map((i) => ({ caminho: i.path.join('.'), mensagem: i.message })),
    });
  }

  console.error('[erro]', erro);
  return res.status(500).json({ erro: 'Erro interno', codigo: 'interno' });
};
