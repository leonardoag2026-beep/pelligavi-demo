import type { Request, Response } from 'express';
import { geoService } from '../services/geo.service.js';
import { ValidacaoError } from '../../../shared/errors/app-error.js';

const geoController = {
  cep: async (req: Request, res: Response) => {
    const endereco = await geoService.porCep(String(req.params.cep ?? ''));
    return res.json(endereco);
  },

  // usada pelo front para bloquear o avanço antes do pagamento
  distancia: async (req: Request, res: Response) => {
    const endereco = String(req.query.endereco ?? '');
    if (!endereco.trim()) throw new ValidacaoError('Informe o endereço');
    return res.json(await geoService.distanciaKm(endereco));
  },

  ruas: async (req: Request, res: Response) => {
    const sugestoes = await geoService.ruas(String(req.query.q ?? ''));
    return res.json({ sugestoes });
  },

  sugestoes: async (req: Request, res: Response) => {
    const sugestoes = await geoService.sugestoes(String(req.query.q ?? ''));
    return res.json({ sugestoes });
  },
};

export default geoController;
