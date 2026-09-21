const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { formatarMoeda } = require('../utils/formatadores');

const router = express.Router();
const MODELO = 'claude-opus-5';
const MAX_RODADAS_FERRAMENTA = 8;

function carregarCatalogoCompleto() {
  const itens = db
    .prepare(`SELECT * FROM itens_catalogo WHERE ativo = 1 ORDER BY ordem_categoria, categoria, ordem_item, id`)
    .all();
  return itens.map((item) => ({
    ...item,
    componentes: item.modo_precificacao === 'composto'
      ? db.prepare('SELECT * FROM itens_catalogo_componentes WHERE item_catalogo_id = ? ORDER BY ordem, id').all(item.id)
      : [],
  }));
}

function descreverCatalogoParaPrompt(catalogo) {
  const categorias = [];
  catalogo.forEach((item) => {
    let grupo = categorias.find((c) => c.categoria === item.categoria);
    if (!grupo) {
      grupo = { categoria: item.categoria, itens: [] };
      categorias.push(grupo);
    }
    grupo.itens.push(item);
  });

  return categorias.map((grupo) => {
    const linhasItens = grupo.itens.map((item) => {
      if (item.modo_precificacao === 'composto') {
        const componentes = item.componentes
          .map((c) => `${c.nome} (${c.unidade}, custo ${formatarMoeda(c.custo_unitario)}/${c.unidade})`)
          .join('; ');
        return `  - [id=${item.id}] ${item.nome} — precificado por múltiplos quantitativos: ${componentes}. Descrição: "${item.descricao_template}"`;
      }
      return `  - [id=${item.id}] ${item.nome} — unidade "${item.unidade}", custo ${formatarMoeda(item.custo_base)}/${item.unidade}. Descrição: "${item.descricao_template}"`;
    }).join('\n');
    return `${grupo.categoria}:\n${linhasItens}`;
  }).join('\n\n');
}

function montarSystemPrompt(catalogo, empresa) {
  return `Você é o assistente de propostas da ${empresa.nome}, uma empresa de engenharia e execução de obras.
Sua função é conversar com o dono da empresa (que não é técnico em informática) para descobrir o que uma obra
específica vai precisar, e ir registrando isso através das ferramentas disponíveis, até montar uma proposta completa.

CATÁLOGO DE SERVIÇOS DISPONÍVEIS (use os "id" exatos ao chamar as ferramentas):
${descreverCatalogoParaPrompt(catalogo)}

MARKUP PADRÃO DA EMPRESA: ${empresa.markup_padrao}%
VALIDADE PADRÃO DAS PROPOSTAS: ${empresa.validade_padrao_dias} dias

COMO CONDUZIR A CONVERSA:
1. Faça UMA pergunta objetiva por vez, em português, de forma amigável e direta (sem jargão técnico desnecessário).
2. Comece coletando os dados gerais: nome do cliente, título/resumo da proposta, projeto, local da obra e prazo estimado.
   Registre cada resposta com a ferramenta atualizar_dados_gerais assim que o usuário responder.
3. Depois, percorra as categorias do catálogo perguntando se a obra tem aquele tipo de serviço. Use bom senso: se o
   usuário já disse que é algo pequeno (ex: "só uma reforma de banheiro"), não pergunte sobre fundações/estrutura de
   um prédio inteiro. Pule categorias claramente irrelevantes sem perguntar, mas avise brevemente que está pulando.
4. Quando o usuário confirmar que um serviço se aplica, pergunte a quantidade necessária (ou, para itens compostos,
   pergunte cada quantitativo: ex "quantos m² de forma, quantos kg de aço e quantos m³ de concreto?"). Registre com
   definir_escopo_item assim que tiver os números. Se o usuário não souber um número exato, ajude a estimar ou aceite
   uma estimativa aproximada — não trave a conversa por falta de precisão.
5. Pergunte se quer usar o markup padrão da empresa (${empresa.markup_padrao}%) ou outro valor, e registre com definir_markup.
6. Pergunte sobre as condições de pagamento (ex: "10% na assinatura, 80% em medições, 10% na entrega" é comum aqui).
   Registre a lista completa de uma vez com definir_parcelas_pagamento (os percentuais devem somar 100).
7. Pergunte se há alguma observação especial para esta proposta (algo não incluso, alguma condição específica).
   Registre com definir_observacoes_gerais (pode ser uma lista vazia se não houver nada além do padrão).
8. Quando tiver dados gerais, ao menos um item de escopo, markup e condições de pagamento definidos, chame
   finalizar_coleta e escreva uma mensagem final avisando que a proposta está pronta para revisão.

Sempre responda em português do Brasil. Seja breve e conversacional — isso é um chat, não um formulário longo.
Nunca invente valores de custo: os custos já vêm do catálogo acima, você só precisa das quantidades.`;
}

const FERRAMENTAS = [
  {
    name: 'atualizar_dados_gerais',
    description: 'Registra ou atualiza os dados gerais da proposta (cliente, título, projeto, local, prazo, validade).',
    input_schema: {
      type: 'object',
      properties: {
        cliente_nome: { type: 'string', description: 'Nome do cliente/contratante' },
        titulo: { type: 'string', description: 'Título curto da proposta, ex: "Execução de Obra — Etapa Cinza"' },
        subtitulo: { type: 'string', description: 'Subtítulo/identificação do projeto' },
        projeto: { type: 'string', description: 'Nome do projeto' },
        local: { type: 'string', description: 'Endereço/local da obra' },
        prazo: { type: 'string', description: 'Prazo estimado, ex: "6 meses"' },
        validade_dias: { type: 'number', description: 'Validade da proposta em dias' },
      },
    },
  },
  {
    name: 'definir_escopo_item',
    description: 'Marca um item do catálogo como parte do escopo desta proposta, com sua(s) quantidade(s).',
    input_schema: {
      type: 'object',
      properties: {
        item_catalogo_id: { type: 'integer', description: 'O id do item no catálogo, exatamente como listado' },
        quantidade: { type: 'number', description: 'Quantidade (apenas para itens de quantidade única)' },
        componentes: {
          type: 'array',
          description: 'Apenas para itens de múltiplos quantitativos: uma entrada por quantitativo do item.',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string', description: 'Nome do quantitativo, exatamente como no catálogo (ex: "Aço")' },
              quantidade: { type: 'number' },
            },
            required: ['nome', 'quantidade'],
          },
        },
      },
      required: ['item_catalogo_id'],
    },
  },
  {
    name: 'remover_escopo_item',
    description: 'Remove um item previamente marcado, caso o usuário mude de ideia.',
    input_schema: {
      type: 'object',
      properties: { item_catalogo_id: { type: 'integer' } },
      required: ['item_catalogo_id'],
    },
  },
  {
    name: 'definir_markup',
    description: 'Define o percentual de markup/margem a aplicar sobre o custo total.',
    input_schema: {
      type: 'object',
      properties: { markup_percentual: { type: 'number' } },
      required: ['markup_percentual'],
    },
  },
  {
    name: 'definir_parcelas_pagamento',
    description: 'Define a lista completa de condições de pagamento (substitui qualquer lista anterior).',
    input_schema: {
      type: 'object',
      properties: {
        parcelas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descricao: { type: 'string' },
              percentual: { type: 'number' },
            },
            required: ['descricao', 'percentual'],
          },
        },
      },
      required: ['parcelas'],
    },
  },
  {
    name: 'definir_observacoes_gerais',
    description: 'Define a lista completa de observações gerais da proposta (substitui qualquer lista anterior).',
    input_schema: {
      type: 'object',
      properties: {
        observacoes: { type: 'array', items: { type: 'string' } },
      },
      required: ['observacoes'],
    },
  },
  {
    name: 'finalizar_coleta',
    description: 'Chame quando tiver informações suficientes para montar a proposta e a conversa puder terminar.',
    input_schema: { type: 'object', properties: {} },
  },
];

function rascunhoVazio() {
  return {
    dados_gerais: {},
    itens: [],
    markup_percentual: null,
    condicoes_pagamento: [],
    observacoes_gerais: [],
  };
}

function executarFerramenta(nome, input, rascunho, catalogoPorId) {
  switch (nome) {
    case 'atualizar_dados_gerais':
      Object.assign(rascunho.dados_gerais, input);
      return { ok: true };

    case 'definir_escopo_item': {
      const item = catalogoPorId.get(input.item_catalogo_id);
      if (!item) return { erro: `item_catalogo_id ${input.item_catalogo_id} não existe no catálogo.` };
      rascunho.itens = rascunho.itens.filter((i) => i.item_catalogo_id !== input.item_catalogo_id);
      rascunho.itens.push({
        item_catalogo_id: item.id,
        quantidade: input.quantidade ?? null,
        componentes: input.componentes || [],
      });
      return { ok: true, item_registrado: item.nome };
    }

    case 'remover_escopo_item':
      rascunho.itens = rascunho.itens.filter((i) => i.item_catalogo_id !== input.item_catalogo_id);
      return { ok: true };

    case 'definir_markup':
      rascunho.markup_percentual = Number(input.markup_percentual) || 0;
      return { ok: true };

    case 'definir_parcelas_pagamento':
      rascunho.condicoes_pagamento = input.parcelas || [];
      return { ok: true };

    case 'definir_observacoes_gerais':
      rascunho.observacoes_gerais = input.observacoes || [];
      return { ok: true };

    case 'finalizar_coleta':
      return { ok: true };

    default:
      return { erro: `Ferramenta desconhecida: ${nome}` };
  }
}

router.post('/mensagem', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      erro: 'A chave da API da Anthropic (ANTHROPIC_API_KEY) ainda não foi configurada no servidor. '
        + 'Veja o arquivo .env.example para instruções de como configurar.',
    });
  }

  const mensagens = Array.isArray(req.body.mensagens) ? [...req.body.mensagens] : [];
  const rascunho = req.body.rascunho && typeof req.body.rascunho === 'object' ? req.body.rascunho : rascunhoVazio();
  if (!mensagens.length) return res.status(400).json({ erro: 'Envie ao menos uma mensagem.' });

  const catalogo = carregarCatalogoCompleto();
  const catalogoPorId = new Map(catalogo.map((item) => [item.id, item]));
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
  const client = new Anthropic();

  const system = [
    { type: 'text', text: montarSystemPrompt(catalogo, empresa), cache_control: { type: 'ephemeral' } },
  ];

  let finalizado = false;
  let ultimaMensagemTexto = '';

  try {
    for (let rodada = 0; rodada < MAX_RODADAS_FERRAMENTA; rodada += 1) {
      const resposta = await client.messages.create({
        model: MODELO,
        max_tokens: 1500,
        system,
        tools: FERRAMENTAS,
        messages: mensagens,
      });

      mensagens.push({ role: 'assistant', content: resposta.content });

      const textos = resposta.content.filter((b) => b.type === 'text').map((b) => b.text);
      if (textos.length) ultimaMensagemTexto = textos.join('\n');

      const usosDeFerramenta = resposta.content.filter((b) => b.type === 'tool_use');
      if (usosDeFerramenta.length === 0) break;

      const resultados = usosDeFerramenta.map((uso) => {
        if (uso.name === 'finalizar_coleta') finalizado = true;
        const resultado = executarFerramenta(uso.name, uso.input, rascunho, catalogoPorId);
        return { type: 'tool_result', tool_use_id: uso.id, content: JSON.stringify(resultado) };
      });
      mensagens.push({ role: 'user', content: resultados });
    }

    res.json({ mensagens, rascunho, mensagem_assistente: ultimaMensagemTexto, finalizado });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(400).json({ erro: 'A chave da API da Anthropic configurada é inválida.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ erro: 'Limite de uso da API atingido. Tente novamente em instantes.' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ erro: `Erro ao falar com a IA: ${err.message}` });
    }
    throw err;
  }
});

module.exports = router;
// Exposto apenas para os testes automatizados do próprio time (ver /server/routes/assistente.test.js).
module.exports.executarFerramenta = executarFerramenta;
module.exports.rascunhoVazio = rascunhoVazio;
module.exports.montarSystemPrompt = montarSystemPrompt;
