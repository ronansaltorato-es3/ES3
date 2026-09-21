const PDFDocument = require('pdfkit');
const { formatarMoeda, formatarData } = require('../utils/formatadores');

function dataValidade(dataIso, validadeDias) {
  const data = new Date(`${dataIso}T00:00:00`);
  data.setDate(data.getDate() + validadeDias);
  return data.toLocaleDateString('pt-BR');
}

const COR_TITULO = '#1a2b4c';
const COR_TEXTO = '#333333';
const COR_LINHA = '#dddddd';
const COR_CABECALHO_TABELA = '#1a2b4c';

function gerarPdfOrcamento(empresa, orcamento) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const larguraUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Cabeçalho
  doc.fillColor(COR_TITULO).fontSize(20).font('Helvetica-Bold').text(empresa.nome || 'Empresa', { continued: false });
  doc.fontSize(9).font('Helvetica').fillColor(COR_TEXTO);
  const linhasEmpresa = [empresa.documento, empresa.telefone, empresa.email, empresa.endereco].filter(Boolean);
  if (linhasEmpresa.length) doc.text(linhasEmpresa.join('  •  '));

  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(COR_TITULO).text(`ORÇAMENTO Nº ${orcamento.numero}`, {
    align: 'right',
  });
  doc.fontSize(9).font('Helvetica').fillColor(COR_TEXTO).text(`Data: ${formatarData(orcamento.data)}`, { align: 'right' });
  doc.text(`Válido até: ${dataValidade(orcamento.data, orcamento.validade_dias)}`, { align: 'right' });

  doc.moveDown(1);
  doc
    .strokeColor(COR_LINHA)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.8);

  // Dados do cliente
  doc.fontSize(11).font('Helvetica-Bold').fillColor(COR_TITULO).text('Cliente');
  doc.fontSize(10).font('Helvetica').fillColor(COR_TEXTO);
  doc.text(orcamento.cliente_nome);
  const linhasCliente = [orcamento.cliente_endereco, orcamento.cliente_cidade].filter(Boolean).join(' - ');
  if (linhasCliente) doc.text(linhasCliente);
  const contatoCliente = [orcamento.cliente_telefone, orcamento.cliente_email].filter(Boolean).join('  •  ');
  if (contatoCliente) doc.text(contatoCliente);

  doc.moveDown(1);

  // Tabela de itens
  const colunas = [
    { titulo: 'Descrição', largura: larguraUtil * 0.42, align: 'left' },
    { titulo: 'Unid.', largura: larguraUtil * 0.1, align: 'center' },
    { titulo: 'Qtd.', largura: larguraUtil * 0.12, align: 'right' },
    { titulo: 'Preço Unit.', largura: larguraUtil * 0.16, align: 'right' },
    { titulo: 'Subtotal', largura: larguraUtil * 0.2, align: 'right' },
  ];

  function desenharCabecalhoTabela() {
    const y = doc.y;
    doc.rect(doc.page.margins.left, y, larguraUtil, 22).fill(COR_CABECALHO_TABELA);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    let x = doc.page.margins.left;
    colunas.forEach((coluna) => {
      doc.text(coluna.titulo, x + 6, y + 6, { width: coluna.largura - 12, align: coluna.align });
      x += coluna.largura;
    });
    doc.y = y + 22;
  }

  function verificarQuebraDePagina(alturaNecessaria) {
    const limite = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alturaNecessaria > limite) {
      doc.addPage();
      desenharCabecalhoTabela();
    }
  }

  desenharCabecalhoTabela();

  doc.font('Helvetica').fontSize(9.5).fillColor(COR_TEXTO);
  orcamento.itens.forEach((item, indice) => {
    const subtotal = item.quantidade * item.preco_unitario;
    const alturaLinha = 20;
    verificarQuebraDePagina(alturaLinha);

    const y = doc.y;
    if (indice % 2 === 1) {
      doc.rect(doc.page.margins.left, y, larguraUtil, alturaLinha).fill('#f5f6fa');
      doc.fillColor(COR_TEXTO);
    }

    let x = doc.page.margins.left;
    const valores = [
      item.descricao,
      item.unidade,
      item.quantidade.toLocaleString('pt-BR'),
      formatarMoeda(item.preco_unitario),
      formatarMoeda(subtotal),
    ];
    valores.forEach((valor, i) => {
      doc.text(String(valor), x + 6, y + 5, { width: colunas[i].largura - 12, align: colunas[i].align });
      x += colunas[i].largura;
    });
    doc.y = y + alturaLinha;
  });

  doc.moveDown(0.5);
  doc
    .strokeColor(COR_LINHA)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);

  // Totais
  const larguraTotais = 220;
  const xTotais = doc.page.width - doc.page.margins.right - larguraTotais;

  function linhaTotal(rotulo, valor, destaque) {
    const y = doc.y;
    doc.font(destaque ? 'Helvetica-Bold' : 'Helvetica').fontSize(destaque ? 12 : 10).fillColor(COR_TEXTO);
    doc.text(rotulo, xTotais, y, { width: larguraTotais * 0.5, align: 'left' });
    doc.text(formatarMoeda(valor), xTotais + larguraTotais * 0.5, y, {
      width: larguraTotais * 0.5,
      align: 'right',
    });
    doc.x = doc.page.margins.left;
    doc.y = y + doc.currentLineHeight() + 4;
  }

  linhaTotal('Subtotal', orcamento.subtotal, false);
  if (orcamento.desconto_percentual > 0) {
    linhaTotal(`Desconto (${orcamento.desconto_percentual}%)`, -orcamento.desconto, false);
  }
  doc.moveDown(0.3);
  linhaTotal('TOTAL', orcamento.total, true);

  doc.moveDown(1.5);

  // Observações
  if (orcamento.observacoes) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COR_TITULO).text('Observações');
    doc.font('Helvetica').fontSize(9.5).fillColor(COR_TEXTO).text(orcamento.observacoes, {
      width: larguraUtil,
    });
  }

  doc.end();
  return doc;
}

module.exports = gerarPdfOrcamento;
