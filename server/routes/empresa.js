const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
  res.json(empresa);
});

router.put('/', (req, res) => {
  const {
    nome, documento, telefone, email, endereco, validade_padrao_dias, observacoes_padrao,
    sobre_empresa, frase_rodape, diferenciais, motivos_escolha, markup_padrao,
    responsavel_nome, responsavel_cargo, responsavel_registro, proximo_numero_proposta,
    slogan, forma_pagamento,
  } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome da empresa.' });
  }

  db.prepare(
    `UPDATE empresa SET nome = ?, documento = ?, telefone = ?, email = ?, endereco = ?,
     validade_padrao_dias = ?, observacoes_padrao = ?, sobre_empresa = ?, frase_rodape = ?,
     diferenciais = ?, motivos_escolha = ?, markup_padrao = ?, responsavel_nome = ?,
     responsavel_cargo = ?, responsavel_registro = ?, proximo_numero_proposta = ?,
     slogan = ?, forma_pagamento = ?
     WHERE id = 1`
  ).run(
    nome.trim(),
    documento || '',
    telefone || '',
    email || '',
    endereco || '',
    Number(validade_padrao_dias) || 15,
    observacoes_padrao || '',
    sobre_empresa || '',
    frase_rodape || '',
    diferenciais || '',
    motivos_escolha || '',
    Number(markup_padrao) || 0,
    responsavel_nome || '',
    responsavel_cargo || '',
    responsavel_registro || '',
    Number(proximo_numero_proposta) || 1,
    slogan || '',
    forma_pagamento || ''
  );
  res.json(db.prepare('SELECT * FROM empresa WHERE id = 1').get());
});

module.exports = router;
