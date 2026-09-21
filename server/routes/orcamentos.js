const express = require('express');
const db = require('../db');
const gerarPdfOrcamento = require('../pdf/orcamentoPdf');

const router = express.Router();

function calcularTotais(itens, descontoPercentual) {
  const subtotal = itens.reduce((soma, item) => soma + item.quantidade * item.preco_unitario, 0);
  const desconto = subtotal * (Number(descontoPercentual) || 0) / 100;
  const total = subtotal - desconto;
  return { subtotal, desconto, total };
}

function proximoNumero() {
  const ano = new Date().getFullYear();
  const ultimo = db
    .prepare("SELECT numero FROM orcamentos WHERE numero LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${ano}-%`);
  const proximaSequencia = ultimo ? Number(ultimo.numero.split('-')[1]) + 1 : 1;
  return `${ano}-${String(proximaSequencia).padStart(4, '0')}`;
}

function carregarOrcamentoCompleto(id) {
  const orcamento = db
    .prepare(
      `SELECT o.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
              c.email AS cliente_email, c.endereco AS cliente_endereco, c.cidade AS cliente_cidade
       FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id
       WHERE o.id = ?`
    )
    .get(id);
  if (!orcamento) return null;

  const itens = db
    .prepare('SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY ordem, id')
    .all(id);

  const totais = calcularTotais(itens, orcamento.desconto_percentual);
  return { ...orcamento, itens, ...totais };
}

router.get('/', (req, res) => {
  const orcamentos = db
    .prepare(
      `SELECT o.id, o.numero, o.data, o.status, o.desconto_percentual, c.nome AS cliente_nome
       FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id
       ORDER BY o.id DESC`
    )
    .all();

  const comTotais = orcamentos.map((o) => {
    const itens = db.prepare('SELECT quantidade, preco_unitario FROM orcamento_itens WHERE orcamento_id = ?').all(o.id);
    const totais = calcularTotais(itens, o.desconto_percentual);
    return { ...o, ...totais };
  });

  res.json(comTotais);
});

router.get('/:id', (req, res) => {
  const orcamento = carregarOrcamentoCompleto(req.params.id);
  if (!orcamento) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  res.json(orcamento);
});

function validarPayload(body) {
  if (!body.cliente_id) return 'Selecione um cliente.';
  if (!Array.isArray(body.itens) || body.itens.length === 0) return 'Adicione pelo menos um item ao orçamento.';
  for (const item of body.itens) {
    if (!item.descricao || !item.descricao.trim()) return 'Todo item precisa de uma descrição.';
    const quantidade = Number(item.quantidade);
    const preco = Number(item.preco_unitario);
    if (Number.isNaN(quantidade) || quantidade <= 0) return `Quantidade inválida para "${item.descricao}".`;
    if (Number.isNaN(preco) || preco < 0) return `Preço unitário inválido para "${item.descricao}".`;
  }
  return null;
}

router.post('/', (req, res) => {
  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.body.cliente_id);
  if (!cliente) return res.status(400).json({ erro: 'Cliente inválido.' });

  const empresa = db.prepare('SELECT validade_padrao_dias, observacoes_padrao FROM empresa WHERE id = 1').get();
  const numero = proximoNumero();

  const inserirOrcamento = db.prepare(
    `INSERT INTO orcamentos (numero, cliente_id, data, validade_dias, desconto_percentual, observacoes, status)
     VALUES (?, ?, date('now'), ?, ?, ?, 'rascunho')`
  );
  const inserirItem = db.prepare(
    `INSERT INTO orcamento_itens (orcamento_id, servico_id, descricao, unidade, quantidade, preco_unitario, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const transacao = db.transaction((body) => {
    const info = inserirOrcamento.run(
      numero,
      body.cliente_id,
      Number(body.validade_dias) || empresa.validade_padrao_dias,
      Number(body.desconto_percentual) || 0,
      body.observacoes !== undefined ? body.observacoes : empresa.observacoes_padrao
    );
    body.itens.forEach((item, indice) => {
      inserirItem.run(
        info.lastInsertRowid,
        item.servico_id || null,
        item.descricao.trim(),
        item.unidade || 'unid',
        Number(item.quantidade),
        Number(item.preco_unitario),
        indice
      );
    });
    return info.lastInsertRowid;
  });

  const id = transacao(req.body);
  res.status(201).json(carregarOrcamentoCompleto(id));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM orcamentos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Orçamento não encontrado.' });

  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.body.cliente_id);
  if (!cliente) return res.status(400).json({ erro: 'Cliente inválido.' });

  const atualizarOrcamento = db.prepare(
    `UPDATE orcamentos SET cliente_id = ?, validade_dias = ?, desconto_percentual = ?, observacoes = ?, status = ?
     WHERE id = ?`
  );
  const limparItens = db.prepare('DELETE FROM orcamento_itens WHERE orcamento_id = ?');
  const inserirItem = db.prepare(
    `INSERT INTO orcamento_itens (orcamento_id, servico_id, descricao, unidade, quantidade, preco_unitario, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const transacao = db.transaction((body) => {
    atualizarOrcamento.run(
      body.cliente_id,
      Number(body.validade_dias) || 15,
      Number(body.desconto_percentual) || 0,
      body.observacoes || '',
      body.status || 'rascunho',
      req.params.id
    );
    limparItens.run(req.params.id);
    body.itens.forEach((item, indice) => {
      inserirItem.run(
        req.params.id,
        item.servico_id || null,
        item.descricao.trim(),
        item.unidade || 'unid',
        Number(item.quantidade),
        Number(item.preco_unitario),
        indice
      );
    });
  });

  transacao(req.body);
  res.json(carregarOrcamentoCompleto(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM orcamentos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  res.status(204).end();
});

router.get('/:id/pdf', async (req, res) => {
  const orcamento = carregarOrcamentoCompleto(req.params.id);
  if (!orcamento) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="orcamento-${orcamento.numero}.pdf"`);
  gerarPdfOrcamento(empresa, orcamento).pipe(res);
});

module.exports = router;
