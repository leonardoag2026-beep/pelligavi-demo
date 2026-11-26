import type { NextFunction, Request, Response } from 'express';
import { NaoAutorizadoError } from '../errors/app-error.js';
import { verificar } from '../security/jwt.js';

export interface ClienteAutenticado {
  id: number;
  nome: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    cliente?: ClienteAutenticado;
  }
}

export const COOKIE_CLIENTE = 'x-cliente';

const cookieDe = (req: Request): string | undefined => {
  const bruto = req.headers.cookie || '';
  const par = bruto.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_CLIENTE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE_CLIENTE.length + 1)) : undefined;
};

export const autenticarCliente = (req: Request, _res: Response, next: NextFunction): void => {
  const doCookie = cookieDe(req);
  const doHeader = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verificar(doCookie || doHeader);
  if (!payload) throw new NaoAutorizadoError('Entre na sua conta para continuar');
  req.cliente = { id: Number(payload.sub), nome: payload.nome };
  next();
};
