-- 22. gerente: login do painel. Senha em scrypt (demo: pizzaria2026).
-- O seed antigo (02_seed.sql) trouxe bcrypt de outra stack; aqui o hash é regravado no
-- formato que o servidor confere, mantendo o mesmo login.
UPDATE gerente SET senha_hash = 'scrypt$16384$8$1$1f0d3fd9a841302ceedd3385b2b1de3a$0d8a0ad34786b66a79f7447bd2b49deda5ee0e81d82e58769de743969ccde98e' WHERE login = 'gerente@pelligavi.com';

INSERT INTO gerente (nome, login, senha_hash)
SELECT 'Senhor Gerente', 'gerente@pelligavi.com', 'scrypt$16384$8$1$1f0d3fd9a841302ceedd3385b2b1de3a$0d8a0ad34786b66a79f7447bd2b49deda5ee0e81d82e58769de743969ccde98e'
WHERE NOT EXISTS (SELECT 1 FROM gerente WHERE login = 'gerente@pelligavi.com');
