import type { NextFunction, Request, Response } from 'express';
import { NaoAutorizadoError } from '../errors/app-error.js';
import { verificar } from '../security/jwt.js';

export interface GerenteAutenticado {
  id: number;
  nome: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    gerente?: GerenteAutenticado;
  }
}

export const COOKIE_TOKEN = 'x-token';

const cookieDe = (req: Request): string | undefined => {
  const bruto = req.headers.cookie || '';
  const par = bruto.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_TOKEN}=`));
  return par ? decodeURIComponent(par.slice(COOKIE_TOKEN.length + 1)) : undefined;
};

export const autenticar = (req: Request, _res: Response, next: NextFunction): void => {
  const doCookie = cookieDe(req);
  const doHeader = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verificar(doCookie || doHeader);
  if (!payload) throw new NaoAutorizadoError('Sessão expirada ou inválida');
  req.gerente = { id: Number(payload.sub), nome: payload.nome };
  next();
};
