const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'es3.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nome TEXT NOT NULL DEFAULT '',
    documento TEXT NOT NULL DEFAULT '',
    telefone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    endereco TEXT NOT NULL DEFAULT '',
    validade_padrao_dias INTEGER NOT NULL DEFAULT 15,
    observacoes_padrao TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    endereco TEXT NOT NULL DEFAULT '',
    cidade TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'unid',
    preco_unitario REAL NOT NULL DEFAULT 0,
    categoria TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    data TEXT NOT NULL DEFAULT (date('now')),
    validade_dias INTEGER NOT NULL DEFAULT 15,
    desconto_percentual REAL NOT NULL DEFAULT 0,
    observacoes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'rascunho',
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamento_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    servico_id INTEGER REFERENCES servicos(id),
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'unid',
    quantidade REAL NOT NULL DEFAULT 1,
    preco_unitario REAL NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0
  );
`);

const empresaExiste = db.prepare('SELECT id FROM empresa WHERE id = 1').get();
if (!empresaExiste) {
  db.prepare(
    `INSERT INTO empresa (id, nome, documento, telefone, email, endereco, validade_padrao_dias, observacoes_padrao)
     VALUES (1, 'Minha Empresa', '', '', '', '', 15, 'Orçamento não inclui itens não especificados. Forma de pagamento a combinar.')`
  ).run();
}

module.exports = db;
