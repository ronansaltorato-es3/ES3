const estado = {
  clientes: [],
  servicos: [],
  catalogo: [],
  editandoClienteId: null,
  editandoServicoId: null,
  editandoOrcamentoId: null,
  editandoCatalogoId: null,
  editandoPropostaId: null,
};

// ---------- Utilidades ----------

function mostrarToast(mensagem, erro = false) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `toast mostrar${erro ? ' erro' : ''}`;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

async function chamarApi(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || 'Ocorreu um erro inesperado.');
  }
  return dados;
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------- Navegação por abas ----------

document.querySelectorAll('.aba-btn').forEach((botao) => {
  botao.addEventListener('click', () => mostrarAba(botao.dataset.aba));
});

function mostrarAba(nome) {
  document.querySelectorAll('.aba').forEach((secao) => { secao.style.display = 'none'; });
  document.getElementById(`aba-${nome}`).style.display = 'block';
  document.querySelectorAll('.aba-btn').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.aba === nome);
  });
}

// ---------- Empresa ----------

async function carregarEmpresa() {
  const empresa = await chamarApi('/api/empresa');
  estado.empresa = empresa;
  document.getElementById('empresa-nome').value = empresa.nome || '';
  document.getElementById('empresa-slogan').value = empresa.slogan || '';
  document.getElementById('empresa-documento').value = empresa.documento || '';
  document.getElementById('empresa-telefone').value = empresa.telefone || '';
  document.getElementById('empresa-email').value = empresa.email || '';
  document.getElementById('empresa-endereco').value = empresa.endereco || '';
  document.getElementById('empresa-sobre').value = empresa.sobre_empresa || '';
  document.getElementById('empresa-diferenciais').value = empresa.diferenciais || '';
  document.getElementById('empresa-motivos').value = empresa.motivos_escolha || '';
  document.getElementById('empresa-frase-rodape').value = empresa.frase_rodape || '';
  document.getElementById('empresa-markup').value = empresa.markup_padrao || 0;
  document.getElementById('empresa-forma-pagamento').value = empresa.forma_pagamento || '';
  document.getElementById('empresa-proximo-numero').value = empresa.proximo_numero_proposta || 1;
  document.getElementById('empresa-validade').value = empresa.validade_padrao_dias || 15;
  document.getElementById('empresa-responsavel-nome').value = empresa.responsavel_nome || '';
  document.getElementById('empresa-responsavel-cargo').value = empresa.responsavel_cargo || '';
  document.getElementById('empresa-responsavel-registro').value = empresa.responsavel_registro || '';
  document.getElementById('empresa-observacoes').value = empresa.observacoes_padrao || '';
  return empresa;
}

document.getElementById('form-empresa').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await chamarApi('/api/empresa', {
      method: 'PUT',
      body: JSON.stringify({
        nome: document.getElementById('empresa-nome').value,
        slogan: document.getElementById('empresa-slogan').value,
        documento: document.getElementById('empresa-documento').value,
        telefone: document.getElementById('empresa-telefone').value,
        sobre_empresa: document.getElementById('empresa-sobre').value,
        diferenciais: document.getElementById('empresa-diferenciais').value,
        motivos_escolha: document.getElementById('empresa-motivos').value,
        frase_rodape: document.getElementById('empresa-frase-rodape').value,
        markup_padrao: document.getElementById('empresa-markup').value,
        forma_pagamento: document.getElementById('empresa-forma-pagamento').value,
        proximo_numero_proposta: document.getElementById('empresa-proximo-numero').value,
        responsavel_nome: document.getElementById('empresa-responsavel-nome').value,
        responsavel_cargo: document.getElementById('empresa-responsavel-cargo').value,
        responsavel_registro: document.getElementById('empresa-responsavel-registro').value,
        email: document.getElementById('empresa-email').value,
        endereco: document.getElementById('empresa-endereco').value,
        validade_padrao_dias: document.getElementById('empresa-validade').value,
        observacoes_padrao: document.getElementById('empresa-observacoes').value,
      }),
    });
    mostrarToast('Dados da empresa salvos.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Clientes ----------

async function carregarClientes() {
  estado.clientes = await chamarApi('/api/clientes');
  const lista = document.getElementById('lista-clientes');
  lista.innerHTML = estado.clientes.map((cliente) => `
    <tr>
      <td>${cliente.nome}</td>
      <td>${cliente.telefone || '-'}</td>
      <td>${cliente.email || '-'}</td>
      <td>${cliente.cidade || '-'}</td>
      <td>
        <button class="btn-link" onclick="editarCliente(${cliente.id})">Editar</button>
        <button class="btn-perigo" onclick="excluirCliente(${cliente.id})">Excluir</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhum cliente cadastrado ainda.</td></tr>';

  ['orcamento-cliente', 'proposta-cliente'].forEach((idSelect) => {
    const select = document.getElementById(idSelect);
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione...</option>' +
      estado.clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
    if (valorAtual) select.value = valorAtual;
  });
}

window.editarCliente = (id) => {
  const cliente = estado.clientes.find((c) => c.id === id);
  estado.editandoClienteId = id;
  document.getElementById('cliente-id').value = id;
  document.getElementById('cliente-nome').value = cliente.nome;
  document.getElementById('cliente-telefone').value = cliente.telefone;
  document.getElementById('cliente-email').value = cliente.email;
  document.getElementById('cliente-endereco').value = cliente.endereco;
  document.getElementById('cliente-cidade').value = cliente.cidade;
  document.getElementById('btn-cancelar-cliente').style.display = 'inline-block';
};

document.getElementById('btn-cancelar-cliente').addEventListener('click', () => {
  estado.editandoClienteId = null;
  document.getElementById('form-cliente').reset();
  document.getElementById('btn-cancelar-cliente').style.display = 'none';
});

window.excluirCliente = async (id) => {
  if (!confirm('Excluir este cliente?')) return;
  try {
    await chamarApi(`/api/clientes/${id}`, { method: 'DELETE' });
    await carregarClientes();
    mostrarToast('Cliente excluído.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
};

document.getElementById('form-cliente').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const corpo = JSON.stringify({
    nome: document.getElementById('cliente-nome').value,
    telefone: document.getElementById('cliente-telefone').value,
    email: document.getElementById('cliente-email').value,
    endereco: document.getElementById('cliente-endereco').value,
    cidade: document.getElementById('cliente-cidade').value,
  });
  try {
    if (estado.editandoClienteId) {
      await chamarApi(`/api/clientes/${estado.editandoClienteId}`, { method: 'PUT', body: corpo });
      mostrarToast('Cliente atualizado.');
    } else {
      await chamarApi('/api/clientes', { method: 'POST', body: corpo });
      mostrarToast('Cliente cadastrado.');
    }
    estado.editandoClienteId = null;
    document.getElementById('form-cliente').reset();
    document.getElementById('btn-cancelar-cliente').style.display = 'none';
    await carregarClientes();
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Serviços ----------

async function carregarServicos() {
  estado.servicos = await chamarApi('/api/servicos');
  const lista = document.getElementById('lista-servicos');
  lista.innerHTML = estado.servicos.map((servico) => `
    <tr>
      <td>${servico.nome}</td>
      <td>${servico.unidade}</td>
      <td>${formatarMoeda(servico.preco_unitario)}</td>
      <td>${servico.categoria || '-'}</td>
      <td>
        <button class="btn-link" onclick="editarServico(${servico.id})">Editar</button>
        <button class="btn-perigo" onclick="excluirServico(${servico.id})">Excluir</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhum serviço cadastrado ainda.</td></tr>';
}

window.editarServico = (id) => {
  const servico = estado.servicos.find((s) => s.id === id);
  estado.editandoServicoId = id;
  document.getElementById('servico-id').value = id;
  document.getElementById('servico-nome').value = servico.nome;
  document.getElementById('servico-unidade').value = servico.unidade;
  document.getElementById('servico-preco').value = servico.preco_unitario;
  document.getElementById('servico-categoria').value = servico.categoria;
  document.getElementById('btn-cancelar-servico').style.display = 'inline-block';
};

document.getElementById('btn-cancelar-servico').addEventListener('click', () => {
  estado.editandoServicoId = null;
  document.getElementById('form-servico').reset();
  document.getElementById('btn-cancelar-servico').style.display = 'none';
});

window.excluirServico = async (id) => {
  if (!confirm('Excluir este serviço do catálogo?')) return;
  try {
    await chamarApi(`/api/servicos/${id}`, { method: 'DELETE' });
    await carregarServicos();
    mostrarToast('Serviço excluído.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
};

document.getElementById('form-servico').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const corpo = JSON.stringify({
    nome: document.getElementById('servico-nome').value,
    unidade: document.getElementById('servico-unidade').value,
    preco_unitario: document.getElementById('servico-preco').value,
    categoria: document.getElementById('servico-categoria').value,
  });
  try {
    if (estado.editandoServicoId) {
      await chamarApi(`/api/servicos/${estado.editandoServicoId}`, { method: 'PUT', body: corpo });
      mostrarToast('Serviço atualizado.');
    } else {
      await chamarApi('/api/servicos', { method: 'POST', body: corpo });
      mostrarToast('Serviço cadastrado.');
    }
    estado.editandoServicoId = null;
    document.getElementById('form-servico').reset();
    document.getElementById('btn-cancelar-servico').style.display = 'none';
    await carregarServicos();
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Catálogo de Escopo ----------

async function carregarCatalogo() {
  estado.catalogo = await chamarApi('/api/itens-catalogo');
  const container = document.getElementById('lista-catalogo');

  if (!estado.catalogo.length) {
    container.innerHTML = '<p class="dica">Nenhum item cadastrado ainda.</p>';
    return;
  }

  const categorias = [];
  estado.catalogo.forEach((item) => {
    let grupo = categorias.find((c) => c.categoria === item.categoria);
    if (!grupo) {
      grupo = { categoria: item.categoria, itens: [] };
      categorias.push(grupo);
    }
    grupo.itens.push(item);
  });

  container.innerHTML = categorias.map((grupo) => `
    <h3>${grupo.categoria}</h3>
    <table class="tabela">
      <thead>
        <tr><th>Nome</th><th>Descrição</th><th>Unid.</th><th>Custo base</th><th></th></tr>
      </thead>
      <tbody>
        ${grupo.itens.map((item) => `
          <tr>
            <td>${item.nome}</td>
            <td>${item.descricao_template}</td>
            <td>${item.unidade}</td>
            <td>${formatarMoeda(item.custo_base)}</td>
            <td>
              <button class="btn-link" onclick="editarCatalogo(${item.id})">Editar</button>
              <button class="btn-perigo" onclick="excluirCatalogo(${item.id})">Excluir</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('');
}

window.editarCatalogo = (id) => {
  const item = estado.catalogo.find((i) => i.id === id);
  estado.editandoCatalogoId = id;
  document.getElementById('catalogo-id').value = id;
  document.getElementById('catalogo-categoria').value = item.categoria;
  document.getElementById('catalogo-ordem-categoria').value = item.ordem_categoria;
  document.getElementById('catalogo-nome').value = item.nome;
  document.getElementById('catalogo-unidade').value = item.unidade;
  document.getElementById('catalogo-custo').value = item.custo_base;
  document.getElementById('catalogo-descricao').value = item.descricao_template;
  document.getElementById('btn-cancelar-catalogo').style.display = 'inline-block';
};

document.getElementById('btn-cancelar-catalogo').addEventListener('click', () => {
  estado.editandoCatalogoId = null;
  document.getElementById('form-catalogo').reset();
  document.getElementById('btn-cancelar-catalogo').style.display = 'none';
});

window.excluirCatalogo = async (id) => {
  if (!confirm('Remover este item do catálogo? (propostas já criadas com ele não são afetadas)')) return;
  try {
    await chamarApi(`/api/itens-catalogo/${id}`, { method: 'DELETE' });
    await carregarCatalogo();
    mostrarToast('Item removido do catálogo.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
};

document.getElementById('form-catalogo').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const corpo = JSON.stringify({
    categoria: document.getElementById('catalogo-categoria').value,
    ordem_categoria: document.getElementById('catalogo-ordem-categoria').value,
    nome: document.getElementById('catalogo-nome').value,
    unidade: document.getElementById('catalogo-unidade').value,
    custo_base: document.getElementById('catalogo-custo').value,
    descricao_template: document.getElementById('catalogo-descricao').value,
  });
  try {
    if (estado.editandoCatalogoId) {
      await chamarApi(`/api/itens-catalogo/${estado.editandoCatalogoId}`, { method: 'PUT', body: corpo });
      mostrarToast('Item atualizado.');
    } else {
      await chamarApi('/api/itens-catalogo', { method: 'POST', body: corpo });
      mostrarToast('Item cadastrado no catálogo.');
    }
    estado.editandoCatalogoId = null;
    document.getElementById('form-catalogo').reset();
    document.getElementById('btn-cancelar-catalogo').style.display = 'none';
    await carregarCatalogo();
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Orçamentos ----------

async function carregarOrcamentos() {
  const orcamentos = await chamarApi('/api/orcamentos');
  const lista = document.getElementById('lista-orcamentos');
  lista.innerHTML = orcamentos.map((o) => `
    <tr>
      <td>${o.numero}</td>
      <td>${o.cliente_nome}</td>
      <td>${o.data.split('-').reverse().join('/')}</td>
      <td>${formatarMoeda(o.total)}</td>
      <td><span class="tag-status ${o.status}">${o.status}</span></td>
      <td>
        <button class="btn-link" onclick="abrirPdf(${o.id})">Ver PDF</button>
        <button class="btn-link" onclick="editarOrcamento(${o.id})">Editar</button>
        <button class="btn-perigo" onclick="excluirOrcamento(${o.id})">Excluir</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Nenhum orçamento criado ainda.</td></tr>';
}

window.abrirPdf = (id) => window.open(`/api/orcamentos/${id}/pdf`, '_blank');

window.excluirOrcamento = async (id) => {
  if (!confirm('Excluir este orçamento?')) return;
  try {
    await chamarApi(`/api/orcamentos/${id}`, { method: 'DELETE' });
    await carregarOrcamentos();
    mostrarToast('Orçamento excluído.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
};

function linhaItemHtml(item = {}) {
  const opcoesServicos = ['<option value="">Item personalizado</option>']
    .concat(estado.servicos.map((s) => `<option value="${s.id}" ${item.servico_id === s.id ? 'selected' : ''}>${s.nome}</option>`))
    .join('');
  return `
    <tr class="linha-item">
      <td>
        <select class="item-servico">${opcoesServicos}</select>
      </td>
      <td><input type="text" class="item-descricao" value="${item.descricao || ''}" required /></td>
      <td><input type="text" class="item-unidade" value="${item.unidade || 'unid'}" /></td>
      <td><input type="number" class="item-quantidade" min="0.01" step="0.01" value="${item.quantidade || 1}" /></td>
      <td><input type="number" class="item-preco" min="0" step="0.01" value="${item.preco_unitario || 0}" /></td>
      <td class="item-subtotal">R$ 0,00</td>
      <td><button type="button" class="btn-perigo btn-remover-item">✕</button></td>
    </tr>
  `;
}

function adicionarLinhaItem(item) {
  const corpoTabela = document.getElementById('itens-orcamento');
  corpoTabela.insertAdjacentHTML('beforeend', linhaItemHtml(item));
  const novaLinha = corpoTabela.lastElementChild;
  ligarEventosLinha(novaLinha);
  recalcularTotais();
}

function ligarEventosLinha(linha) {
  linha.querySelector('.btn-remover-item').addEventListener('click', () => {
    linha.remove();
    recalcularTotais();
  });

  linha.querySelector('.item-servico').addEventListener('change', (evento) => {
    const servico = estado.servicos.find((s) => String(s.id) === evento.target.value);
    if (servico) {
      linha.querySelector('.item-descricao').value = servico.nome;
      linha.querySelector('.item-unidade').value = servico.unidade;
      linha.querySelector('.item-preco').value = servico.preco_unitario;
      recalcularTotais();
    }
  });

  ['.item-quantidade', '.item-preco'].forEach((seletor) => {
    linha.querySelector(seletor).addEventListener('input', recalcularTotais);
  });
}

function recalcularTotais() {
  let subtotalGeral = 0;
  document.querySelectorAll('#itens-orcamento .linha-item').forEach((linha) => {
    const quantidade = Number(linha.querySelector('.item-quantidade').value) || 0;
    const preco = Number(linha.querySelector('.item-preco').value) || 0;
    const subtotal = quantidade * preco;
    linha.querySelector('.item-subtotal').textContent = formatarMoeda(subtotal);
    subtotalGeral += subtotal;
  });

  const descontoPercentual = Number(document.getElementById('orcamento-desconto').value) || 0;
  const desconto = subtotalGeral * descontoPercentual / 100;
  const total = subtotalGeral - desconto;

  document.getElementById('total-subtotal').textContent = formatarMoeda(subtotalGeral);
  document.getElementById('total-desconto').textContent = formatarMoeda(desconto);
  document.getElementById('total-geral').textContent = formatarMoeda(total);
}

document.getElementById('orcamento-desconto').addEventListener('input', recalcularTotais);
document.getElementById('btn-add-item').addEventListener('click', () => adicionarLinhaItem());

document.getElementById('btn-novo-orcamento').addEventListener('click', () => {
  estado.editandoOrcamentoId = null;
  document.getElementById('titulo-form-orcamento').textContent = 'Novo Orçamento';
  document.getElementById('form-orcamento').reset();
  document.getElementById('itens-orcamento').innerHTML = '';
  adicionarLinhaItem();
  recalcularTotais();
  mostrarAba('form-orcamento');
});

document.getElementById('btn-voltar-orcamentos').addEventListener('click', async () => {
  await carregarOrcamentos();
  mostrarAba('orcamentos');
});

window.editarOrcamento = async (id) => {
  const orcamento = await chamarApi(`/api/orcamentos/${id}`);
  estado.editandoOrcamentoId = id;
  document.getElementById('titulo-form-orcamento').textContent = `Editar Orçamento ${orcamento.numero}`;
  document.getElementById('orcamento-cliente').value = orcamento.cliente_id;
  document.getElementById('orcamento-validade').value = orcamento.validade_dias;
  document.getElementById('orcamento-desconto').value = orcamento.desconto_percentual;
  document.getElementById('orcamento-observacoes').value = orcamento.observacoes;
  document.getElementById('itens-orcamento').innerHTML = '';
  orcamento.itens.forEach((item) => adicionarLinhaItem(item));
  recalcularTotais();
  mostrarAba('form-orcamento');
};

document.getElementById('form-orcamento').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const itens = Array.from(document.querySelectorAll('#itens-orcamento .linha-item')).map((linha) => ({
    servico_id: linha.querySelector('.item-servico').value || null,
    descricao: linha.querySelector('.item-descricao').value,
    unidade: linha.querySelector('.item-unidade').value,
    quantidade: linha.querySelector('.item-quantidade').value,
    preco_unitario: linha.querySelector('.item-preco').value,
  }));

  const corpo = JSON.stringify({
    cliente_id: document.getElementById('orcamento-cliente').value,
    validade_dias: document.getElementById('orcamento-validade').value,
    desconto_percentual: document.getElementById('orcamento-desconto').value,
    observacoes: document.getElementById('orcamento-observacoes').value,
    itens,
  });

  try {
    let orcamento;
    if (estado.editandoOrcamentoId) {
      orcamento = await chamarApi(`/api/orcamentos/${estado.editandoOrcamentoId}`, { method: 'PUT', body: corpo });
      mostrarToast('Orçamento atualizado.');
    } else {
      orcamento = await chamarApi('/api/orcamentos', { method: 'POST', body: corpo });
      mostrarToast('Orçamento criado! Abrindo o PDF...');
    }
    await carregarOrcamentos();
    mostrarAba('orcamentos');
    if (!estado.editandoOrcamentoId) window.open(`/api/orcamentos/${orcamento.id}/pdf`, '_blank');
    estado.editandoOrcamentoId = null;
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Propostas ----------

const OBSERVACOES_PADRAO_PROPOSTA = [
  'Esta proposta contempla exclusivamente mão de obra. Todos os materiais de construção são de fornecimento e responsabilidade do contratante.',
  'Todos os serviços serão faturados com emissão de Nota Fiscal.',
  'O início dos serviços fica condicionado à assinatura do contrato e pagamento da entrada.',
  'Interferências não previstas em projeto serão tratadas como aditivo contratual mediante aprovação prévia por escrito.',
  'Quaisquer alterações de escopo serão formalizadas como aditivo contratual.',
].join('\n');

async function carregarPropostas() {
  const propostas = await chamarApi('/api/propostas');
  const lista = document.getElementById('lista-propostas');
  lista.innerHTML = propostas.map((p) => `
    <tr>
      <td>${p.numero}-${p.revisao}</td>
      <td>${p.titulo}</td>
      <td>${p.cliente_nome}</td>
      <td>${p.data.split('-').reverse().join('/')}</td>
      <td>${formatarMoeda(p.valor_final)}</td>
      <td><span class="tag-status ${p.status}">${p.status}</span></td>
      <td>
        <button class="btn-link" onclick="abrirPdfProposta(${p.id})">Ver PDF</button>
        <button class="btn-link" onclick="editarProposta(${p.id})">Editar</button>
        <button class="btn-perigo" onclick="excluirProposta(${p.id})">Excluir</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhuma proposta criada ainda.</td></tr>';
}

window.abrirPdfProposta = (id) => window.open(`/api/propostas/${id}/pdf`, '_blank');

window.excluirProposta = async (id) => {
  if (!confirm('Excluir esta proposta?')) return;
  try {
    await chamarApi(`/api/propostas/${id}`, { method: 'DELETE' });
    await carregarPropostas();
    mostrarToast('Proposta excluída.');
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
};

function renderizarEscopoCatalogo(itensSelecionados = []) {
  const container = document.getElementById('escopo-catalogo');
  if (!estado.catalogo.length) {
    container.innerHTML = '<p class="dica">Nenhum item no catálogo ainda. Cadastre na aba "Catálogo de Escopo".</p>';
    return;
  }

  const selecaoPorId = new Map(itensSelecionados.filter((i) => i.item_catalogo_id).map((i) => [i.item_catalogo_id, i]));

  const categorias = [];
  estado.catalogo.forEach((item) => {
    let grupo = categorias.find((c) => c.categoria === item.categoria);
    if (!grupo) {
      grupo = { categoria: item.categoria, itens: [] };
      categorias.push(grupo);
    }
    grupo.itens.push(item);
  });

  container.innerHTML = categorias.map((grupo) => `
    <div class="escopo-categoria">
      <h4>${grupo.categoria}</h4>
      ${grupo.itens.map((item) => {
        const selecionado = selecaoPorId.get(item.id);
        return `
          <div class="escopo-item">
            <label class="escopo-item-check">
              <input type="checkbox" class="escopo-checkbox" data-id="${item.id}" ${selecionado ? 'checked' : ''} />
              <strong>${item.nome}</strong>
              <span class="escopo-item-custo">${formatarMoeda(item.custo_base)} / ${item.unidade}</span>
            </label>
            <p class="escopo-item-descricao">${item.descricao_template}</p>
            <input
              type="number" class="escopo-quantidade" data-id="${item.id}" min="0.01" step="0.01"
              placeholder="Quantidade em ${item.unidade}"
              value="${selecionado ? selecionado.quantidade : ''}"
              ${selecionado ? '' : 'disabled'}
            />
          </div>
        `;
      }).join('')}
    </div>
  `).join('');

  container.querySelectorAll('.escopo-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const input = container.querySelector(`.escopo-quantidade[data-id="${checkbox.dataset.id}"]`);
      input.disabled = !checkbox.checked;
      if (checkbox.checked && !input.value) input.value = 1;
      recalcularFinanceiroProposta();
    });
  });
  container.querySelectorAll('.escopo-quantidade').forEach((input) => {
    input.addEventListener('input', recalcularFinanceiroProposta);
  });
}

function itensEscopoSelecionados() {
  const container = document.getElementById('escopo-catalogo');
  const itens = [];
  container.querySelectorAll('.escopo-checkbox:checked').forEach((checkbox) => {
    const id = Number(checkbox.dataset.id);
    const item = estado.catalogo.find((i) => i.id === id);
    const quantidadeInput = container.querySelector(`.escopo-quantidade[data-id="${id}"]`);
    const quantidade = Number(quantidadeInput.value) || 0;
    if (!item || quantidade <= 0) return;
    const descricao = item.descricao_template.includes('{{qtd}}')
      ? item.descricao_template.replace('{{qtd}}', `${quantidade.toLocaleString('pt-BR')} ${item.unidade}`)
      : item.descricao_template;
    itens.push({
      item_catalogo_id: item.id,
      categoria: item.categoria,
      descricao,
      unidade: item.unidade,
      quantidade,
      custo_unitario: item.custo_base,
    });
  });
  return itens;
}

function recalcularFinanceiroProposta() {
  const itens = itensEscopoSelecionados();
  const custoTotal = itens.reduce((soma, item) => soma + item.quantidade * item.custo_unitario, 0);
  const markup = Number(document.getElementById('proposta-markup').value) || 0;
  const valorCalculado = custoTotal * (1 + markup / 100);

  document.getElementById('proposta-custo-total').value = formatarMoeda(custoTotal);
  document.getElementById('proposta-valor-calculado').value = formatarMoeda(valorCalculado);

  const campoValorFinal = document.getElementById('proposta-valor-final');
  const ultimoValorAuto = campoValorFinal.dataset.ultimoAuto;
  const valorAtual = campoValorFinal.value ? Number(campoValorFinal.value) : null;
  if (!valorAtual || (ultimoValorAuto && Math.abs(valorAtual - Number(ultimoValorAuto)) < 0.005)) {
    campoValorFinal.value = valorCalculado.toFixed(2);
  }
  campoValorFinal.dataset.ultimoAuto = valorCalculado.toFixed(2);

  recalcularPagamentos();
}

function linhaPagamentoHtml(parcela = {}) {
  return `
    <tr class="linha-pagamento">
      <td><input type="text" class="pagamento-descricao" value="${parcela.descricao || ''}" required /></td>
      <td><input type="number" class="pagamento-percentual" min="0" max="100" step="0.01" value="${parcela.percentual ?? ''}" /></td>
      <td><input type="number" class="pagamento-valor" min="0" step="0.01" value="${parcela.valor || ''}" /></td>
      <td><button type="button" class="btn-perigo btn-remover-pagamento">✕</button></td>
    </tr>
  `;
}

function adicionarLinhaPagamento(parcela) {
  const corpoTabela = document.getElementById('pagamentos-proposta');
  corpoTabela.insertAdjacentHTML('beforeend', linhaPagamentoHtml(parcela));
  const linha = corpoTabela.lastElementChild;
  linha.querySelector('.btn-remover-pagamento').addEventListener('click', () => linha.remove());
  linha.querySelector('.pagamento-percentual').addEventListener('input', recalcularPagamentos);
}

function recalcularPagamentos() {
  const valorFinal = Number(document.getElementById('proposta-valor-final').value) || 0;
  document.querySelectorAll('#pagamentos-proposta .linha-pagamento').forEach((linha) => {
    const percentual = linha.querySelector('.pagamento-percentual').value;
    if (percentual !== '') {
      const valor = valorFinal * Number(percentual) / 100;
      linha.querySelector('.pagamento-valor').value = valor.toFixed(2);
    }
  });
}

document.getElementById('proposta-markup').addEventListener('input', recalcularFinanceiroProposta);
document.getElementById('proposta-valor-final').addEventListener('input', recalcularPagamentos);
document.getElementById('btn-add-pagamento').addEventListener('click', () => adicionarLinhaPagamento());

document.getElementById('proposta-cliente').addEventListener('change', (evento) => {
  const campoContato = document.getElementById('proposta-contato');
  if (campoContato.value.trim()) return;
  const cliente = estado.clientes.find((c) => String(c.id) === evento.target.value);
  if (cliente) campoContato.value = cliente.nome;
});

document.getElementById('btn-nova-proposta').addEventListener('click', () => {
  estado.editandoPropostaId = null;
  document.getElementById('titulo-form-proposta').textContent = 'Nova Proposta';
  document.getElementById('form-proposta').reset();
  document.getElementById('proposta-numero').value = '';
  document.getElementById('proposta-revisao').value = '';
  document.getElementById('proposta-validade').value = estado.empresa?.validade_padrao_dias || 15;
  document.getElementById('proposta-markup').value = estado.empresa?.markup_padrao || 0;
  document.getElementById('proposta-valor-final').value = '';
  document.getElementById('proposta-valor-final').dataset.ultimoAuto = '';
  document.getElementById('proposta-observacao-investimento').value =
    'Valor referente exclusivamente à mão de obra. Serviços faturados com emissão de Nota Fiscal.';
  document.getElementById('proposta-forma-pagamento').value = estado.empresa?.forma_pagamento || '';
  document.getElementById('proposta-observacoes-gerais').value = OBSERVACOES_PADRAO_PROPOSTA;
  document.getElementById('proposta-responsavel-nome').value = estado.empresa?.responsavel_nome || '';
  document.getElementById('proposta-responsavel-cargo').value = estado.empresa?.responsavel_cargo || '';
  document.getElementById('proposta-responsavel-registro').value = estado.empresa?.responsavel_registro || '';
  document.getElementById('proposta-status').value = 'rascunho';
  document.getElementById('pagamentos-proposta').innerHTML = '';
  adicionarLinhaPagamento({ descricao: '10% na assinatura do contrato', percentual: 10 });
  adicionarLinhaPagamento({ descricao: '80% em medições mensais proporcionais ao avanço físico da obra', percentual: 80 });
  adicionarLinhaPagamento({ descricao: '10% na entrega final mediante vistoria de conclusão', percentual: 10 });
  renderizarEscopoCatalogo();
  mostrarAba('form-proposta');
});

document.getElementById('btn-voltar-propostas').addEventListener('click', async () => {
  await carregarPropostas();
  mostrarAba('propostas');
});

window.editarProposta = async (id) => {
  const proposta = await chamarApi(`/api/propostas/${id}`);
  estado.editandoPropostaId = id;
  document.getElementById('titulo-form-proposta').textContent = `Editar Proposta ${proposta.numero}-${proposta.revisao}`;
  document.getElementById('proposta-cliente').value = proposta.cliente_id;
  document.getElementById('proposta-contato').value = proposta.contato;
  document.getElementById('proposta-numero').value = proposta.numero;
  document.getElementById('proposta-revisao').value = proposta.revisao;
  document.getElementById('proposta-titulo').value = proposta.titulo;
  document.getElementById('proposta-subtitulo').value = proposta.subtitulo;
  document.getElementById('proposta-projeto').value = proposta.projeto;
  document.getElementById('proposta-local').value = proposta.local;
  document.getElementById('proposta-prazo').value = proposta.prazo;
  document.getElementById('proposta-validade').value = proposta.validade_dias;
  document.getElementById('proposta-markup').value = proposta.markup_percentual;
  document.getElementById('proposta-valor-final').value = proposta.valor_final;
  document.getElementById('proposta-valor-final').dataset.ultimoAuto = proposta.valor_calculado;
  document.getElementById('proposta-observacao-investimento').value = proposta.observacao_investimento;
  document.getElementById('proposta-forma-pagamento').value = proposta.forma_pagamento || estado.empresa?.forma_pagamento || '';
  document.getElementById('proposta-observacoes-gerais').value = (proposta.observacoes_gerais || []).join('\n');
  document.getElementById('proposta-responsavel-nome').value = proposta.responsavel_nome;
  document.getElementById('proposta-responsavel-cargo').value = proposta.responsavel_cargo;
  document.getElementById('proposta-responsavel-registro').value = proposta.responsavel_registro;
  document.getElementById('proposta-status').value = proposta.status;

  document.getElementById('pagamentos-proposta').innerHTML = '';
  (proposta.condicoes_pagamento || []).forEach((parcela) => adicionarLinhaPagamento(parcela));

  renderizarEscopoCatalogo(proposta.itens);
  document.getElementById('proposta-custo-total').value = formatarMoeda(
    proposta.itens.reduce((soma, i) => soma + i.quantidade * i.custo_unitario, 0)
  );
  document.getElementById('proposta-valor-calculado').value = formatarMoeda(proposta.valor_calculado);

  mostrarAba('form-proposta');
};

document.getElementById('form-proposta').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const itens = itensEscopoSelecionados();
  if (!itens.length) {
    mostrarToast('Marque ao menos um item de escopo para a proposta.', true);
    return;
  }

  const condicoes_pagamento = Array.from(document.querySelectorAll('#pagamentos-proposta .linha-pagamento')).map((linha) => ({
    descricao: linha.querySelector('.pagamento-descricao').value,
    percentual: linha.querySelector('.pagamento-percentual').value || null,
    valor: linha.querySelector('.pagamento-valor').value,
  }));

  const observacoes_gerais = document.getElementById('proposta-observacoes-gerais').value
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);

  const corpo = JSON.stringify({
    cliente_id: document.getElementById('proposta-cliente').value,
    contato: document.getElementById('proposta-contato').value,
    numero: document.getElementById('proposta-numero').value,
    revisao: document.getElementById('proposta-revisao').value,
    titulo: document.getElementById('proposta-titulo').value,
    subtitulo: document.getElementById('proposta-subtitulo').value,
    projeto: document.getElementById('proposta-projeto').value,
    local: document.getElementById('proposta-local').value,
    prazo: document.getElementById('proposta-prazo').value,
    validade_dias: document.getElementById('proposta-validade').value,
    markup_percentual: document.getElementById('proposta-markup').value,
    valor_final: document.getElementById('proposta-valor-final').value,
    observacao_investimento: document.getElementById('proposta-observacao-investimento').value,
    forma_pagamento: document.getElementById('proposta-forma-pagamento').value,
    responsavel_nome: document.getElementById('proposta-responsavel-nome').value,
    responsavel_cargo: document.getElementById('proposta-responsavel-cargo').value,
    responsavel_registro: document.getElementById('proposta-responsavel-registro').value,
    status: document.getElementById('proposta-status').value,
    itens,
    condicoes_pagamento,
    observacoes_gerais,
  });

  try {
    let proposta;
    if (estado.editandoPropostaId) {
      proposta = await chamarApi(`/api/propostas/${estado.editandoPropostaId}`, { method: 'PUT', body: corpo });
      mostrarToast('Proposta atualizada.');
    } else {
      proposta = await chamarApi('/api/propostas', { method: 'POST', body: corpo });
      mostrarToast('Proposta criada! Abrindo o PDF...');
    }
    await carregarPropostas();
    mostrarAba('propostas');
    window.open(`/api/propostas/${proposta.id}/pdf`, '_blank');
    estado.editandoPropostaId = null;
  } catch (erro) {
    mostrarToast(erro.message, true);
  }
});

// ---------- Inicialização ----------

(async function iniciar() {
  try {
    await Promise.all([
      carregarEmpresa(),
      carregarClientes(),
      carregarServicos(),
      carregarOrcamentos(),
      carregarCatalogo(),
      carregarPropostas(),
    ]);
  } catch (erro) {
    mostrarToast('Erro ao carregar dados iniciais: ' + erro.message, true);
  }
})();
