const express = require('express');
const db = require('../db');

const router = express.Router();

function carregarComponentes(itemId) {
  return db
    .prepare('SELECT * FROM itens_catalogo_componentes WHERE item_catalogo_id = ? ORDER BY ordem, id')
    .all(itemId);
}

function carregarItemCompleto(id) {
  const item = db.prepare('SELECT * FROM itens_catalogo WHERE id = ?').get(id);
  if (!item) return null;
  return { ...item, componentes: carregarComponentes(id) };
}

router.get('/', (req, res) => {
  const itens = db
    .prepare(
      `SELECT * FROM itens_catalogo
       WHERE ativo = 1
       ORDER BY ordem_categoria, categoria, ordem_item, id`
    )
    .all();
  const comComponentes = itens.map((item) => ({
    ...item,
    componentes: item.modo_precificacao === 'composto' ? carregarComponentes(item.id) : [],
  }));
  res.json(comComponentes);
});

function validarPayload(body) {
  if (!body.nome || !body.nome.trim()) return 'Informe o nome do item.';
  if (!body.categoria || !body.categoria.trim()) return 'Informe a categoria (ex: Fundações, Cobertura).';

  if (body.modo_precificacao === 'composto') {
    if (!Array.isArray(body.componentes) || body.componentes.length === 0) {
      return 'Adicione ao menos um quantitativo (ex: Área de forma, Aço, Concreto).';
    }
    for (const c of body.componentes) {
      if (!c.nome || !c.nome.trim()) return 'Todo quantitativo precisa de um nome.';
      const custo = Number(c.custo_unitario);
      if (Number.isNaN(custo) || custo < 0) return `Custo inválido para "${c.nome}".`;
    }
  } else {
    const custo = Number(body.custo_base);
    if (Number.isNaN(custo) || custo < 0) return 'Informe um custo base válido.';
  }
  return null;
}

function salvarComponentes(itemId, componentes) {
  db.prepare('DELETE FROM itens_catalogo_componentes WHERE item_catalogo_id = ?').run(itemId);
  const inserir = db.prepare(
    `INSERT INTO itens_catalogo_componentes (item_catalogo_id, nome, unidade, custo_unitario, ordem)
     VALUES (?, ?, ?, ?, ?)`
  );
  componentes.forEach((c, indice) => {
    inserir.run(itemId, c.nome.trim(), c.unidade || 'un', Number(c.custo_unitario), indice);
  });
}

router.post('/', (req, res) => {
  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const { categoria, ordem_categoria, ordem_item, nome, descricao_template, unidade, custo_base } = req.body;
  const modo_precificacao = req.body.modo_precificacao === 'composto' ? 'composto' : 'simples';

  const transacao = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO itens_catalogo (categoria, ordem_categoria, ordem_item, nome, descricao_template, modo_precificacao, unidade, custo_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        categoria.trim(),
        Number(ordem_categoria) || 0,
        Number(ordem_item) || 0,
        nome.trim(),
        descricao_template || '',
        modo_precificacao,
        modo_precificacao === 'composto' ? 'composto' : (unidade || 'verba'),
        modo_precificacao === 'composto' ? 0 : Number(custo_base)
      );
    if (modo_precificacao === 'composto') salvarComponentes(info.lastInsertRowid, req.body.componentes);
    return info.lastInsertRowid;
  });

  const id = transacao();
  res.status(201).json(carregarItemCompleto(id));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM itens_catalogo WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Item não encontrado.' });

  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const { categoria, ordem_categoria, ordem_item, nome, descricao_template, unidade, custo_base } = req.body;
  const modo_precificacao = req.body.modo_precificacao === 'composto' ? 'composto' : 'simples';

  const transacao = db.transaction(() => {
    db.prepare(
      `UPDATE itens_catalogo SET categoria = ?, ordem_categoria = ?, ordem_item = ?, nome = ?,
       descricao_template = ?, modo_precificacao = ?, unidade = ?, custo_base = ? WHERE id = ?`
    ).run(
      categoria.trim(),
      Number(ordem_categoria) || 0,
      Number(ordem_item) || 0,
      nome.trim(),
      descricao_template || '',
      modo_precificacao,
      modo_precificacao === 'composto' ? 'composto' : (unidade || 'verba'),
      modo_precificacao === 'composto' ? 0 : Number(custo_base),
      req.params.id
    );
    if (modo_precificacao === 'composto') {
      salvarComponentes(req.params.id, req.body.componentes);
    } else {
      db.prepare('DELETE FROM itens_catalogo_componentes WHERE item_catalogo_id = ?').run(req.params.id);
    }
  });

  transacao();
  res.json(carregarItemCompleto(req.params.id));
});

router.delete('/:id', (req, res) => {
  // Mantém histórico: itens usados em propostas não são removidos, apenas desativados.
  const info = db.prepare('UPDATE itens_catalogo SET ativo = 0 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.status(204).end();
});

module.exports = router;
