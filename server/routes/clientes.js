const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const busca = (req.query.q || '').trim();
  let clientes;
  if (busca) {
    clientes = db
      .prepare('SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome')
      .all(`%${busca}%`);
  } else {
    clientes = db.prepare('SELECT * FROM clientes ORDER BY nome').all();
  }
  res.json(clientes);
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  res.json(cliente);
});

router.post('/', (req, res) => {
  const { nome, telefone, email, endereco, cidade } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do cliente.' });
  }
  const info = db
    .prepare('INSERT INTO clientes (nome, telefone, email, endereco, cidade) VALUES (?, ?, ?, ?, ?)')
    .run(nome.trim(), telefone || '', email || '', endereco || '', cidade || '');
  res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

  const { nome, telefone, email, endereco, cidade } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do cliente.' });
  }
  db.prepare('UPDATE clientes SET nome = ?, telefone = ?, email = ?, endereco = ?, cidade = ? WHERE id = ?').run(
    nome.trim(),
    telefone || '',
    email || '',
    endereco || '',
    cidade || '',
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const emUso = db.prepare('SELECT id FROM orcamentos WHERE cliente_id = ? LIMIT 1').get(req.params.id);
  if (emUso) {
    return res.status(409).json({ erro: 'Este cliente possui orçamentos e não pode ser excluído.' });
  }
  const info = db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  res.status(204).end();
});

module.exports = router;
