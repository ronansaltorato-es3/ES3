const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
  res.json(empresa);
});

router.put('/', (req, res) => {
  const { nome, documento, telefone, email, endereco, validade_padrao_dias, observacoes_padrao } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome da empresa.' });
  }
  db.prepare(
    `UPDATE empresa SET nome = ?, documento = ?, telefone = ?, email = ?, endereco = ?,
     validade_padrao_dias = ?, observacoes_padrao = ? WHERE id = 1`
  ).run(
    nome.trim(),
    documento || '',
    telefone || '',
    email || '',
    endereco || '',
    Number(validade_padrao_dias) || 15,
    observacoes_padrao || ''
  );
  res.json(db.prepare('SELECT * FROM empresa WHERE id = 1').get());
});

module.exports = router;
