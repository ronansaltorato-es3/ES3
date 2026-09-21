const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const busca = (req.query.q || '').trim();
  let servicos;
  if (busca) {
    servicos = db
      .prepare('SELECT * FROM servicos WHERE nome LIKE ? ORDER BY nome')
      .all(`%${busca}%`);
  } else {
    servicos = db.prepare('SELECT * FROM servicos ORDER BY nome').all();
  }
  res.json(servicos);
});

router.post('/', (req, res) => {
  const { nome, unidade, preco_unitario, categoria } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do serviço.' });
  }
  const preco = Number(preco_unitario);
  if (Number.isNaN(preco) || preco < 0) {
    return res.status(400).json({ erro: 'Informe um preço unitário válido.' });
  }
  const info = db
    .prepare('INSERT INTO servicos (nome, unidade, preco_unitario, categoria) VALUES (?, ?, ?, ?)')
    .run(nome.trim(), unidade || 'unid', preco, categoria || '');
  res.status(201).json(db.prepare('SELECT * FROM servicos WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM servicos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Serviço não encontrado.' });

  const { nome, unidade, preco_unitario, categoria } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do serviço.' });
  }
  const preco = Number(preco_unitario);
  if (Number.isNaN(preco) || preco < 0) {
    return res.status(400).json({ erro: 'Informe um preço unitário válido.' });
  }
  db.prepare('UPDATE servicos SET nome = ?, unidade = ?, preco_unitario = ?, categoria = ? WHERE id = ?').run(
    nome.trim(),
    unidade || 'unid',
    preco,
    categoria || '',
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM servicos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM servicos WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({ erro: 'Este serviço já foi usado em orçamentos e não pode ser excluído.' });
    }
    throw err;
  }
});

module.exports = router;
