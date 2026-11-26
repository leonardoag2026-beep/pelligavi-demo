import { um } from '../../../config/db.js';

export interface GerenteLinha {
  id: number;
  nome: string;
  email: string;
  senhaHash: string;
}

export const gerenteRepository = {
  porEmail: (email: string) =>
    um<GerenteLinha>(
      `SELECT id_gerente AS id, nome, login AS email, senha_hash AS "senhaHash"
         FROM gerente WHERE lower(login) = lower($1)`,
      [email],
    ),

  porId: (id: number) =>
    um<GerenteLinha>(
      `SELECT id_gerente AS id, nome, login AS email, senha_hash AS "senhaHash"
         FROM gerente WHERE id_gerente = $1`,
      [id],
    ),
};

export default gerenteRepository;
