const express = require('express');
const db = require('../db');
const gerarPdfProposta = require('../pdf/propostaPdf');

const router = express.Router();

function calcularValores(itens, markupPercentual) {
  const custoTotal = itens.reduce((soma, item) => soma + Number(item.quantidade) * Number(item.custo_unitario), 0);
  const valorCalculado = custoTotal * (1 + (Number(markupPercentual) || 0) / 100);
  return { custoTotal, valorCalculado };
}

function calcularPagamentos(condicoes, valorFinal) {
  return condicoes.map((c) => {
    const percentual = c.percentual !== undefined && c.percentual !== null && c.percentual !== ''
      ? Number(c.percentual)
      : null;
    const valor = percentual !== null ? Math.round(valorFinal * percentual / 100 * 100) / 100 : Number(c.valor) || 0;
    return { descricao: c.descricao, percentual, valor };
  });
}

function carregarPropostaCompleta(id) {
  const proposta = db
    .prepare(
      `SELECT p.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
              c.email AS cliente_email, c.endereco AS cliente_endereco, c.cidade AS cliente_cidade
       FROM propostas p JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = ?`
    )
    .get(id);
  if (!proposta) return null;

  const itens = db
    .prepare('SELECT * FROM proposta_itens WHERE proposta_id = ? ORDER BY ordem, id')
    .all(id);

  return {
    ...proposta,
    itens,
    condicoes_pagamento: JSON.parse(proposta.condicoes_pagamento_json || '[]'),
    observacoes_gerais: JSON.parse(proposta.observacoes_gerais_json || '[]'),
  };
}

router.get('/', (req, res) => {
  const propostas = db
    .prepare(
      `SELECT p.id, p.numero, p.revisao, p.titulo, p.data, p.status, p.valor_final, c.nome AS cliente_nome
       FROM propostas p JOIN clientes c ON c.id = p.cliente_id
       ORDER BY p.id DESC`
    )
    .all();
  res.json(propostas);
});

router.get('/:id', (req, res) => {
  const proposta = carregarPropostaCompleta(req.params.id);
  if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  res.json(proposta);
});

function validarPayload(body) {
  if (!body.cliente_id) return 'Selecione um cliente.';
  if (!body.titulo || !body.titulo.trim()) return 'Informe o título da proposta.';
  if (!Array.isArray(body.itens) || body.itens.length === 0) return 'Selecione pelo menos um item de escopo.';
  for (const item of body.itens) {
    const quantidade = Number(item.quantidade);
    if (Number.isNaN(quantidade) || quantidade <= 0) return `Quantidade inválida em "${item.descricao || item.nome}".`;
  }
  return null;
}

router.post('/', (req, res) => {
  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.body.cliente_id);
  if (!cliente) return res.status(400).json({ erro: 'Cliente inválido.' });

  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
  const { custoTotal, valorCalculado } = calcularValores(req.body.itens, req.body.markup_percentual);
  const valorFinal = req.body.valor_final !== undefined && req.body.valor_final !== ''
    ? Number(req.body.valor_final)
    : Math.round(valorCalculado * 100) / 100;
  const pagamentos = calcularPagamentos(req.body.condicoes_pagamento || [], valorFinal);

  const numero = req.body.numero && req.body.numero.trim()
    ? req.body.numero.trim()
    : String(empresa.proximo_numero_proposta).padStart(4, '0');
  const revisao = req.body.revisao && req.body.revisao.trim() ? req.body.revisao.trim() : 'A';

  const inserirProposta = db.prepare(
    `INSERT INTO propostas (
       numero, revisao, cliente_id, contato, data, titulo, subtitulo, projeto, local, prazo,
       markup_percentual, valor_calculado, valor_final, observacao_investimento, validade_dias,
       condicoes_pagamento_json, observacoes_gerais_json, responsavel_nome, responsavel_cargo,
       responsavel_registro, status
     ) VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho')`
  );
  const inserirItem = db.prepare(
    `INSERT INTO proposta_itens (proposta_id, item_catalogo_id, categoria, descricao, unidade, quantidade, custo_unitario, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transacao = db.transaction((body) => {
    const info = inserirProposta.run(
      numero,
      revisao,
      body.cliente_id,
      body.contato && body.contato.trim() ? body.contato.trim() : cliente.nome,
      body.titulo.trim(),
      body.subtitulo || '',
      body.projeto || '',
      body.local || '',
      body.prazo || '',
      Number(body.markup_percentual) || 0,
      Math.round(valorCalculado * 100) / 100,
      valorFinal,
      body.observacao_investimento !== undefined ? body.observacao_investimento : empresa.observacoes_padrao,
      Number(body.validade_dias) || empresa.validade_padrao_dias,
      JSON.stringify(pagamentos),
      JSON.stringify(body.observacoes_gerais || []),
      body.responsavel_nome || empresa.responsavel_nome,
      body.responsavel_cargo || empresa.responsavel_cargo,
      body.responsavel_registro || empresa.responsavel_registro
    );

    body.itens.forEach((item, indice) => {
      inserirItem.run(
        info.lastInsertRowid,
        item.item_catalogo_id || null,
        item.categoria || '',
        item.descricao || item.nome,
        item.unidade || 'verba',
        Number(item.quantidade),
        Number(item.custo_unitario) || 0,
        indice
      );
    });

    if (!req.body.numero || !req.body.numero.trim()) {
      db.prepare('UPDATE empresa SET proximo_numero_proposta = proximo_numero_proposta + 1 WHERE id = 1').run();
    }

    return info.lastInsertRowid;
  });

  try {
    const id = transacao(req.body);
    res.status(201).json(carregarPropostaCompleta(id));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erro: `Já existe uma proposta com o número ${numero}-${revisao}.` });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT id FROM propostas WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Proposta não encontrada.' });

  const erro = validarPayload(req.body);
  if (erro) return res.status(400).json({ erro });

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.body.cliente_id);
  if (!cliente) return res.status(400).json({ erro: 'Cliente inválido.' });

  const { custoTotal, valorCalculado } = calcularValores(req.body.itens, req.body.markup_percentual);
  const valorFinal = req.body.valor_final !== undefined && req.body.valor_final !== ''
    ? Number(req.body.valor_final)
    : Math.round(valorCalculado * 100) / 100;
  const pagamentos = calcularPagamentos(req.body.condicoes_pagamento || [], valorFinal);

  const atualizarProposta = db.prepare(
    `UPDATE propostas SET numero = ?, revisao = ?, cliente_id = ?, contato = ?, titulo = ?, subtitulo = ?,
     projeto = ?, local = ?, prazo = ?, markup_percentual = ?, valor_calculado = ?, valor_final = ?,
     observacao_investimento = ?, validade_dias = ?, condicoes_pagamento_json = ?, observacoes_gerais_json = ?,
     responsavel_nome = ?, responsavel_cargo = ?, responsavel_registro = ?, status = ?
     WHERE id = ?`
  );
  const limparItens = db.prepare('DELETE FROM proposta_itens WHERE proposta_id = ?');
  const inserirItem = db.prepare(
    `INSERT INTO proposta_itens (proposta_id, item_catalogo_id, categoria, descricao, unidade, quantidade, custo_unitario, ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transacao = db.transaction((body) => {
    atualizarProposta.run(
      body.numero || existente.numero,
      body.revisao || 'A',
      body.cliente_id,
      body.contato && body.contato.trim() ? body.contato.trim() : cliente.nome,
      body.titulo.trim(),
      body.subtitulo || '',
      body.projeto || '',
      body.local || '',
      body.prazo || '',
      Number(body.markup_percentual) || 0,
      Math.round(valorCalculado * 100) / 100,
      valorFinal,
      body.observacao_investimento || '',
      Number(body.validade_dias) || 15,
      JSON.stringify(pagamentos),
      JSON.stringify(body.observacoes_gerais || []),
      body.responsavel_nome || '',
      body.responsavel_cargo || '',
      body.responsavel_registro || '',
      body.status || 'rascunho',
      req.params.id
    );
    limparItens.run(req.params.id);
    body.itens.forEach((item, indice) => {
      inserirItem.run(
        req.params.id,
        item.item_catalogo_id || null,
        item.categoria || '',
        item.descricao || item.nome,
        item.unidade || 'verba',
        Number(item.quantidade),
        Number(item.custo_unitario) || 0,
        indice
      );
    });
  });

  transacao(req.body);
  res.json(carregarPropostaCompleta(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM propostas WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  res.status(204).end();
});

router.get('/:id/pdf', (req, res) => {
  const proposta = carregarPropostaCompleta(req.params.id);
  if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="proposta-${proposta.numero}-${proposta.revisao}.pdf"`);
  gerarPdfProposta(empresa, proposta).pipe(res);
});

module.exports = router;
