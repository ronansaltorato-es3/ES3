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

  CREATE TABLE IF NOT EXISTS itens_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT NOT NULL DEFAULT '',
    ordem_categoria INTEGER NOT NULL DEFAULT 0,
    ordem_item INTEGER NOT NULL DEFAULT 0,
    nome TEXT NOT NULL,
    descricao_template TEXT NOT NULL DEFAULT '',
    unidade TEXT NOT NULL DEFAULT 'verba',
    custo_base REAL NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS propostas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL,
    revisao TEXT NOT NULL DEFAULT 'A',
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    contato TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT (date('now')),
    titulo TEXT NOT NULL DEFAULT '',
    subtitulo TEXT NOT NULL DEFAULT '',
    projeto TEXT NOT NULL DEFAULT '',
    local TEXT NOT NULL DEFAULT '',
    prazo TEXT NOT NULL DEFAULT '',
    markup_percentual REAL NOT NULL DEFAULT 0,
    valor_calculado REAL NOT NULL DEFAULT 0,
    valor_final REAL NOT NULL DEFAULT 0,
    observacao_investimento TEXT NOT NULL DEFAULT '',
    validade_dias INTEGER NOT NULL DEFAULT 15,
    condicoes_pagamento_json TEXT NOT NULL DEFAULT '[]',
    observacoes_gerais_json TEXT NOT NULL DEFAULT '[]',
    responsavel_nome TEXT NOT NULL DEFAULT '',
    responsavel_cargo TEXT NOT NULL DEFAULT '',
    responsavel_registro TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'rascunho',
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (numero, revisao)
  );

  CREATE TABLE IF NOT EXISTS proposta_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposta_id INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
    item_catalogo_id INTEGER REFERENCES itens_catalogo(id),
    categoria TEXT NOT NULL DEFAULT '',
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'verba',
    quantidade REAL NOT NULL DEFAULT 1,
    custo_unitario REAL NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0
  );
`);

// Migração leve: garante as colunas novas de "empresa" mesmo em bancos já existentes.
const colunasEmpresa = db.prepare("PRAGMA table_info(empresa)").all().map((c) => c.name);
const novasColunasEmpresa = {
  sobre_empresa: `TEXT NOT NULL DEFAULT ''`,
  frase_rodape: `TEXT NOT NULL DEFAULT ''`,
  diferenciais: `TEXT NOT NULL DEFAULT ''`,
  motivos_escolha: `TEXT NOT NULL DEFAULT ''`,
  markup_padrao: `REAL NOT NULL DEFAULT 0`,
  responsavel_nome: `TEXT NOT NULL DEFAULT ''`,
  responsavel_cargo: `TEXT NOT NULL DEFAULT ''`,
  responsavel_registro: `TEXT NOT NULL DEFAULT ''`,
  proximo_numero_proposta: `INTEGER NOT NULL DEFAULT 1`,
  slogan: `TEXT NOT NULL DEFAULT ''`,
  forma_pagamento: `TEXT NOT NULL DEFAULT ''`,
};
for (const [coluna, definicao] of Object.entries(novasColunasEmpresa)) {
  if (!colunasEmpresa.includes(coluna)) {
    db.exec(`ALTER TABLE empresa ADD COLUMN ${coluna} ${definicao}`);
  }
}

const empresaExiste = db.prepare('SELECT id FROM empresa WHERE id = 1').get();
if (!empresaExiste) {
  db.prepare(
    `INSERT INTO empresa (
       id, nome, documento, telefone, email, endereco, validade_padrao_dias, observacoes_padrao,
       sobre_empresa, frase_rodape, diferenciais, motivos_escolha, markup_padrao,
       responsavel_nome, responsavel_cargo, responsavel_registro, proximo_numero_proposta,
       slogan, forma_pagamento
     ) VALUES (
       1, 'ES³ Engenharia de Obras', '46.457.450/0001-09', '(47) 93300-3679', '',
       'Rua Afonso Radun, 108, Centro, Barra Velha - SC', 15,
       'Orçamento não inclui itens não especificados. Forma de pagamento a combinar.',
       ?, ?, ?, ?, 0, 'Ronan Saltorato', 'Engenheiro Civil', 'CREA-SC 215310-5', 214,
       'Soluções práticas para problemas concretos', 'PIX ou transferência bancária'
     )`
  ).run(
    'A ES³ Engenharia de Obras é especialista em Gerenciamento, Fiscalização e Execução de Obras, oferecendo soluções inteligentes para garantir qualidade, segurança e eficiência em cada projeto.\n\nNosso compromisso é entregar resultados de excelência, aplicando técnicas modernas, planejamento estratégico e uma equipe altamente qualificada para transformar projetos em realidade.',
    '"Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens." – Colossenses 3:23',
    [
      'Execução Precisa — equipe qualificada e controle técnico em todas as etapas',
      'Transparência Total — relatórios periódicos de avanço com registro fotográfico',
      'Gestão Estratégica — planejamento rigoroso para evitar atrasos e retrabalhos',
      'Conformidade Técnica — atendimento às normas ABNT em toda a execução',
    ].join('\n'),
    [
      'Profissionalismo e Experiência — equipe com histórico em obras de médio e grande porte',
      'Compromisso e Qualidade — obras entregues no prazo e com excelência técnica',
      'Soluções Inteligentes — gestão eficiente para evitar problemas e custos extras',
      'Tranquilidade — cuidamos de tudo para que você não precise se preocupar',
    ].join('\n')
  );
}

module.exports = db;
