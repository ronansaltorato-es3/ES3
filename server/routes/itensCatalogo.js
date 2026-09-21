const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const itens = db
    .prepare(
      `SELECT * FROM itens_catalogo
       WHERE ativo = 1
       ORDER BY ordem_categoria, categoria, ordem_item, id`
    )
    .all();
  res.json(itens);
});

function validarPayload(body) {
  if (!body.nome || !body.nome.trim()) return 'Informe o nome do item.';
  if (!body.categoria || !body.categoria.trim()) return 'Informe a categoria (ex: Fundações, Cobertura).';
  const custo = Number(body.custo_base);
  if (Number.isNaN(custo) || custo < 0) return 'Informe um custo base válido.';
  return null;
}

router.post('/', (req, res) => {
  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const { categoria, ordem_categoria, ordem_item, nome, descricao_template, unidade, custo_base } = req.body;
  const info = db
    .prepare(
      `INSERT INTO itens_catalogo (categoria, ordem_categoria, ordem_item, nome, descricao_template, unidade, custo_base)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      categoria.trim(),
      Number(ordem_categoria) || 0,
      Number(ordem_item) || 0,
      nome.trim(),
      descricao_template || '',
      unidade || 'verba',
      Number(custo_base)
    );
  res.status(201).json(db.prepare('SELECT * FROM itens_catalogo WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM itens_catalogo WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Item não encontrado.' });

  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const { categoria, ordem_categoria, ordem_item, nome, descricao_template, unidade, custo_base } = req.body;
  db.prepare(
    `UPDATE itens_catalogo SET categoria = ?, ordem_categoria = ?, ordem_item = ?, nome = ?,
     descricao_template = ?, unidade = ?, custo_base = ? WHERE id = ?`
  ).run(
    categoria.trim(),
    Number(ordem_categoria) || 0,
    Number(ordem_item) || 0,
    nome.trim(),
    descricao_template || '',
    unidade || 'verba',
    Number(custo_base),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM itens_catalogo WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  // Mantém histórico: itens usados em propostas não são removidos, apenas desativados.
  const info = db.prepare('UPDATE itens_catalogo SET ativo = 0 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.status(204).end();
});

module.exports = router;
