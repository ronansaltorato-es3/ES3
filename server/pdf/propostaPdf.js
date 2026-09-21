const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { formatarMoeda, formatarData } = require('../utils/formatadores');
const valorPorExtenso = require('../utils/valorPorExtenso');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-es3.jpeg');
const MARCA_DAGUA_PATH = path.join(__dirname, '..', 'assets', 'marca-dagua-es3.jpeg');

const COR_HEADER = '#13212e';
const COR_FAIXA = '#4d6d7c';
const COR_TITULO_SECAO = '#3c5a68';
const COR_LINHA_PAR = '#efe8dd';
const COR_BORDA = '#d6d2c7';
const COR_TEXTO = '#2c2c2c';
const COR_TEXTO_CLARO = '#6f6f6f';

const MARGEM = 45;

function gerarPdfProposta(empresa, proposta) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 55, left: MARGEM, right: MARGEM },
  });
  const larguraPagina = doc.page.width;
  const larguraUtil = larguraPagina - MARGEM * 2;

  function desenharMarcaDagua() {
    if (!fs.existsSync(MARCA_DAGUA_PATH)) return;
    const largura = 260;
    const altura = largura * (1002 / 631);
    const x = (larguraPagina - largura) / 2;
    const y = doc.page.height - altura - 30;
    try {
      doc.image(MARCA_DAGUA_PATH, x, y, { width: largura });
    } catch (err) {
      // segue sem marca d'água se a imagem não puder ser lida
    }
  }

  function desenharRodape() {
    const y = doc.page.height - 38;
    doc.strokeColor(COR_BORDA).lineWidth(0.5)
      .moveTo(MARGEM, y - 8).lineTo(larguraPagina - MARGEM, y - 8).stroke();
    if (empresa.frase_rodape) {
      // Escrever tão perto do rodapé faria o PDFKit achar que não cabe e criar
      // página nova (loop infinito). Zeramos a margem inferior só durante esta chamada.
      const margemInferiorOriginal = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.fillColor(COR_TEXTO_CLARO).font('Helvetica-Oblique').fontSize(7.5)
        .text(empresa.frase_rodape, MARGEM, y, { width: larguraUtil, align: 'center', lineBreak: false });
      doc.page.margins.bottom = margemInferiorOriginal;
    }
  }

  function novaPagina() {
    desenharMarcaDagua();
    desenharRodape();
    // As duas funções acima desenham com x/y explícitos, o que deixa o
    // cursor de texto do PDFKit "perdido". Devolve para o topo da página.
    doc.x = doc.page.margins.left;
    doc.y = doc.page.margins.top;
  }

  function verificarQuebraDePagina(alturaNecessaria) {
    const limite = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alturaNecessaria > limite) {
      doc.addPage();
    }
  }

  doc.on('pageAdded', novaPagina);
  novaPagina(); // desenha na primeira página, que já existe antes do listener

  // ---------- Cabeçalho (apenas na primeira página) ----------
  const larguraTextoHeader = larguraUtil - 150;
  const textoNomeHeader = `${empresa.nome}${empresa.slogan ? ' – ' + empresa.slogan : ''}`;
  doc.font('Helvetica-Bold').fontSize(11.5);
  const alturaNomeHeader = doc.heightOfString(textoNomeHeader, { width: larguraTextoHeader });
  const alturaHeader = Math.max(88, alturaNomeHeader + 12 + 12 * 3 + 10);

  doc.rect(0, 0, larguraPagina, alturaHeader).fill(COR_HEADER);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11.5)
    .text(textoNomeHeader, MARGEM, 14, { width: larguraTextoHeader });

  doc.font('Helvetica').fontSize(8.5);
  let yLinhaHeader = 14 + alturaNomeHeader + 6;
  [
    empresa.documento ? `CNPJ: ${empresa.documento}` : null,
    empresa.telefone ? `Whatsapp: ${empresa.telefone}` : null,
    empresa.endereco || null,
  ].filter(Boolean).forEach((linha) => {
    doc.text(linha, MARGEM, yLinhaHeader, { width: larguraTextoHeader });
    yLinhaHeader += 12;
  });

  if (fs.existsSync(LOGO_PATH)) {
    try {
      const larguraLogo = 130;
      const alturaLogo = larguraLogo * (152 / 329);
      const yLogo = (alturaHeader - alturaLogo) / 2;
      doc.image(LOGO_PATH, larguraPagina - MARGEM - larguraLogo, yLogo, { width: larguraLogo });
    } catch (err) {
      // segue sem logo
    }
  }

  // ---------- Faixa do título ----------
  const yFaixa = alturaHeader;
  const alturaFaixa = 74;
  doc.rect(0, yFaixa, larguraPagina, alturaFaixa).fill(COR_FAIXA);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5)
    .text(`PROPOSTA DE SERVIÇOS  |  Nº ${proposta.numero}-${proposta.revisao}`, MARGEM, yFaixa + 10, {
      width: larguraUtil,
    });
  doc.font('Helvetica-Bold').fontSize(15)
    .text((proposta.titulo || '').toUpperCase(), MARGEM, yFaixa + 26, { width: larguraUtil });
  if (proposta.subtitulo) {
    doc.font('Helvetica').fontSize(9.5)
      .text(proposta.subtitulo, MARGEM, yFaixa + 52, { width: larguraUtil });
  }

  doc.x = MARGEM;
  doc.y = yFaixa + alturaFaixa + 18;

  // ---------- Tabela de dados ----------
  const larguraRotulo = 100;

  function linhaTabela(rotulo, valor, indice) {
    if (!valor) return;
    const larguraValor = larguraUtil - larguraRotulo - 16;
    doc.font('Helvetica').fontSize(9.5);
    const alturaTexto = doc.heightOfString(valor, { width: larguraValor });
    const altura = Math.max(22, alturaTexto + 10);
    verificarQuebraDePagina(altura);

    const y = doc.y;
    doc.rect(MARGEM, y, larguraUtil, altura).fill(indice % 2 === 0 ? COR_LINHA_PAR : '#ffffff');
    doc.strokeColor(COR_BORDA).lineWidth(0.5).rect(MARGEM, y, larguraUtil, altura).stroke();
    doc.moveTo(MARGEM + larguraRotulo, y).lineTo(MARGEM + larguraRotulo, y + altura).stroke();

    doc.fillColor(COR_TEXTO).font('Helvetica-Bold').fontSize(9.5)
      .text(rotulo, MARGEM + 8, y + 6, { width: larguraRotulo - 12 });
    doc.font('Helvetica').fontSize(9.5)
      .text(valor, MARGEM + larguraRotulo + 8, y + 6, { width: larguraValor });

    doc.x = MARGEM;
    doc.y = y + altura;
  }

  const linhasInfo = [
    ['Cliente', proposta.cliente_nome],
    ['Contato', proposta.contato],
    ['Data', formatarData(proposta.data)],
    ['Projeto', proposta.projeto],
    ['Local', proposta.local],
    ['Prazo', proposta.prazo],
  ].filter(([, valor]) => valor);
  linhasInfo.forEach(([rotulo, valor], indice) => linhaTabela(rotulo, valor, indice));

  doc.moveDown(1.2);
  doc.x = MARGEM;

  // ---------- Helpers de texto ----------
  function tituloSecao(texto, alturaProximoConteudo = 36) {
    // Reserva também o espaço do primeiro conteúdo da seção, para o título
    // nunca ficar sozinho na última linha de uma página (título "órfão").
    verificarQuebraDePagina(34 + alturaProximoConteudo);
    doc.moveDown(0.4);
    doc.x = MARGEM;
    doc.fillColor(COR_TITULO_SECAO).font('Helvetica-Bold').fontSize(13)
      .text(texto, MARGEM, doc.y, { width: larguraUtil });
    doc.x = MARGEM;
    doc.moveDown(0.15);
    doc.strokeColor(COR_TITULO_SECAO).lineWidth(1.1)
      .moveTo(MARGEM, doc.y).lineTo(larguraPagina - MARGEM, doc.y).stroke();
    doc.moveDown(0.5);
    doc.x = MARGEM;
  }

  function subtituloEscopo(texto) {
    verificarQuebraDePagina(22);
    doc.fillColor(COR_TITULO_SECAO).font('Helvetica-Bold').fontSize(10.5)
      .text(texto, MARGEM, doc.y, { width: larguraUtil });
    doc.x = MARGEM;
    doc.moveDown(0.25);
  }

  function paragrafo(texto, opcoes = {}) {
    const { negrito = false, tamanho = 9.5, espacoDepois = 0.45 } = opcoes;
    doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamanho);
    const altura = doc.heightOfString(texto, { width: larguraUtil });
    verificarQuebraDePagina(altura + 6);
    doc.fillColor(COR_TEXTO).text(texto, MARGEM, doc.y, { width: larguraUtil });
    doc.x = MARGEM;
    doc.moveDown(espacoDepois);
  }

  function marcador(texto) {
    const larguraTexto = larguraUtil - 14;
    doc.font('Helvetica').fontSize(9.5);
    const altura = doc.heightOfString(texto, { width: larguraTexto });
    verificarQuebraDePagina(altura + 6);
    const y = doc.y;
    doc.fillColor(COR_TITULO_SECAO).text('•', MARGEM, y, { width: 12 });
    doc.fillColor(COR_TEXTO).text(texto, MARGEM + 14, y, { width: larguraTexto });
    doc.x = MARGEM;
    doc.moveDown(0.35);
  }

  function listaDuasColunas(itens) {
    const espacoEntreColunas = 20;
    const larguraColuna = (larguraUtil - espacoEntreColunas) / 2;
    for (let i = 0; i < itens.length; i += 2) {
      const esquerda = itens[i];
      const direita = itens[i + 1];
      doc.font('Helvetica').fontSize(9.5);
      const alturaEsquerda = esquerda ? doc.heightOfString(esquerda, { width: larguraColuna - 14 }) : 0;
      const alturaDireita = direita ? doc.heightOfString(direita, { width: larguraColuna - 14 }) : 0;
      const altura = Math.max(alturaEsquerda, alturaDireita);
      verificarQuebraDePagina(altura + 10);

      const y = doc.y;
      if (esquerda) {
        doc.fillColor(COR_TITULO_SECAO).text('•', MARGEM, y, { width: 12 });
        doc.fillColor(COR_TEXTO).text(esquerda, MARGEM + 14, y, { width: larguraColuna - 14 });
      }
      if (direita) {
        const xDireita = MARGEM + larguraColuna + espacoEntreColunas;
        doc.fillColor(COR_TITULO_SECAO).text('•', xDireita, y, { width: 12 });
        doc.fillColor(COR_TEXTO).text(direita, xDireita + 14, y, { width: larguraColuna - 14 });
      }
      doc.x = MARGEM;
      doc.y = y + altura + 10;
    }
  }

  // ---------- Sobre a empresa ----------
  if (empresa.sobre_empresa) {
    tituloSecao(`SOBRE A ${empresa.nome.toUpperCase()}`);
    empresa.sobre_empresa.split('\n').filter((p) => p.trim()).forEach((paragrafoTexto) => {
      paragrafo(paragrafoTexto.trim());
    });
  }

  // ---------- Escopo de execução ----------
  if (proposta.itens.length) {
    tituloSecao('ESCOPO DE EXECUÇÃO');

    const categorias = [];
    proposta.itens.forEach((item) => {
      const categoria = item.categoria || 'Serviços';
      let grupo = categorias.find((c) => c.categoria === categoria);
      if (!grupo) {
        grupo = { categoria, itens: [] };
        categorias.push(grupo);
      }
      grupo.itens.push(item);
    });

    categorias.forEach((grupo, indice) => {
      subtituloEscopo(`${indice + 1}. ${grupo.categoria}`);
      grupo.itens.forEach((item) => paragrafo(item.descricao));
      doc.moveDown(0.15);
    });
  }

  // ---------- Investimento ----------
  const alturaFaixaInvestimento = 24;
  const alturaCaixa = 70;
  tituloSecao('INVESTIMENTO', alturaFaixaInvestimento + alturaCaixa);
  {
    const y = doc.y;
    doc.rect(MARGEM, y, larguraUtil, alturaFaixaInvestimento).fill(COR_FAIXA);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5)
      .text(`INVESTIMENTO — ${proposta.titulo}`, MARGEM + 10, y + 6, { width: larguraUtil - 20 });

    const yCaixa = y + alturaFaixaInvestimento;
    doc.rect(MARGEM, yCaixa, larguraUtil, alturaCaixa).fill(COR_LINHA_PAR);
    doc.strokeColor(COR_BORDA).rect(MARGEM, yCaixa, larguraUtil, alturaCaixa).stroke();

    doc.fillColor(COR_TITULO_SECAO).font('Helvetica-Bold').fontSize(20)
      .text(formatarMoeda(proposta.valor_final), MARGEM, yCaixa + 14, { width: larguraUtil, align: 'center' });
    doc.fillColor(COR_TEXTO_CLARO).font('Helvetica').fontSize(9)
      .text(`(${valorPorExtenso(proposta.valor_final)})`, MARGEM, yCaixa + 38, {
        width: larguraUtil,
        align: 'center',
      });

    doc.x = MARGEM;
    doc.y = yCaixa + alturaCaixa + 6;

    if (proposta.observacao_investimento) {
      doc.fillColor(COR_TEXTO_CLARO).font('Helvetica').fontSize(8.5)
        .text(proposta.observacao_investimento, MARGEM, doc.y, { width: larguraUtil });
      doc.x = MARGEM;
      doc.moveDown(0.6);
    }
  }

  // ---------- Condições de pagamento ----------
  if (proposta.condicoes_pagamento && proposta.condicoes_pagamento.length) {
    tituloSecao('CONDIÇÕES DE PAGAMENTO');

    proposta.condicoes_pagamento.forEach((parcela, indice) => {
      const larguraValor = 150;
      const larguraDescricao = larguraUtil - larguraValor - 12;
      doc.font('Helvetica').fontSize(9.5);
      const alturaTexto = doc.heightOfString(parcela.descricao, { width: larguraDescricao });
      const altura = Math.max(24, alturaTexto + 10);
      verificarQuebraDePagina(altura);

      const y = doc.y;
      doc.rect(MARGEM, y, larguraUtil, altura).fill(indice % 2 === 0 ? '#ffffff' : COR_LINHA_PAR);
      doc.strokeColor(COR_BORDA).lineWidth(0.5).rect(MARGEM, y, larguraUtil, altura).stroke();
      doc.moveTo(MARGEM + larguraDescricao + 12, y).lineTo(MARGEM + larguraDescricao + 12, y + altura).stroke();

      doc.fillColor(COR_TEXTO).font('Helvetica').fontSize(9.5)
        .text(parcela.descricao, MARGEM + 8, y + 6, { width: larguraDescricao - 12 });
      doc.font('Helvetica-Bold')
        .text(formatarMoeda(parcela.valor), MARGEM + larguraDescricao + 12, y + 6, {
          width: larguraValor - 8,
          align: 'right',
        });

      doc.x = MARGEM;
      doc.y = y + altura;
    });

    doc.moveDown(0.3);
    if (empresa.forma_pagamento || proposta.forma_pagamento) {
      paragrafo(`Forma de pagamento: ${proposta.forma_pagamento || empresa.forma_pagamento}`, { tamanho: 9 });
    }
  }

  // ---------- Observações gerais ----------
  if (proposta.observacoes_gerais && proposta.observacoes_gerais.length) {
    tituloSecao('OBSERVAÇÕES GERAIS');
    proposta.observacoes_gerais.forEach((texto) => marcador(texto));
  }

  // ---------- Garantia e diferenciais ----------
  if (empresa.diferenciais) {
    const itens = empresa.diferenciais.split('\n').filter((l) => l.trim());
    if (itens.length) {
      tituloSecao(`GARANTIA & DIFERENCIAIS DA ${empresa.nome.toUpperCase()}`);
      listaDuasColunas(itens);
    }
  }

  // ---------- Por que escolher ----------
  if (empresa.motivos_escolha) {
    const itens = empresa.motivos_escolha.split('\n').filter((l) => l.trim());
    if (itens.length) {
      tituloSecao(`POR QUE ESCOLHER A ${empresa.nome.toUpperCase()}?`);
      listaDuasColunas(itens);
      doc.moveDown(0.6);
      paragrafo(
        `A ${empresa.nome} está pronta para conduzir tecnicamente esta intervenção com responsabilidade e segurança.`,
        { negrito: true }
      );
    }
  }

  // ---------- Fechamento ----------
  verificarQuebraDePagina(120);
  if (proposta.local) paragrafo(`Local da Obra: ${proposta.local}`, { negrito: true, espacoDepois: 0.2 });
  if (proposta.prazo) paragrafo(`Prazo Estimado de Execução: ${proposta.prazo}`, { negrito: true, espacoDepois: 0.2 });
  paragrafo(`Validade da proposta: ${proposta.validade_dias} dias a partir da data de emissão.`, {
    negrito: true,
    espacoDepois: 0.8,
  });

  paragrafo('Atenciosamente,', { espacoDepois: 0.15 });
  paragrafo(empresa.nome, { negrito: true, espacoDepois: 0.15 });
  if (proposta.responsavel_nome) {
    paragrafo(
      `${proposta.responsavel_nome}${proposta.responsavel_cargo ? ' - ' + proposta.responsavel_cargo : ''}`,
      { negrito: true, espacoDepois: 0.1 }
    );
  }
  if (proposta.responsavel_registro) {
    paragrafo(proposta.responsavel_registro, { negrito: true });
  }

  doc.end();
  return doc;
}

module.exports = gerarPdfProposta;
