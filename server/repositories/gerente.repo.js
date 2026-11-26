import { um } from '../db.js';

export const porLogin = (login) =>
  um('SELECT id_gerente, nome, login, senha_hash FROM gerente WHERE login = $1', [login]);

export const porId = (id) =>
  um('SELECT id_gerente, nome, login FROM gerente WHERE id_gerente = $1', [id]);

export const criar = ({ nome, login, senhaHash }) =>
  um(
    `INSERT INTO gerente (nome, login, senha_hash) VALUES ($1, $2, $3)
     RETURNING id_gerente, nome, login`,
    [nome, login, senhaHash]
  );

export const trocarSenha = (id, senhaHash) =>
  um('UPDATE gerente SET senha_hash = $2 WHERE id_gerente = $1 RETURNING id_gerente', [id, senhaHash]);
