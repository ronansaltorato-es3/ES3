const estado = {
  clientes: [],
  servicos: [],
  editandoClienteId: null,
  editandoServicoId: null,
  editandoOrcamentoId: null,
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
  document.getElementById('empresa-nome').value = empresa.nome || '';
  document.getElementById('empresa-documento').value = empresa.documento || '';
  document.getElementById('empresa-telefone').value = empresa.telefone || '';
  document.getElementById('empresa-email').value = empresa.email || '';
  document.getElementById('empresa-endereco').value = empresa.endereco || '';
  document.getElementById('empresa-validade').value = empresa.validade_padrao_dias || 15;
  document.getElementById('empresa-observacoes').value = empresa.observacoes_padrao || '';
}

document.getElementById('form-empresa').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await chamarApi('/api/empresa', {
      method: 'PUT',
      body: JSON.stringify({
        nome: document.getElementById('empresa-nome').value,
        documento: document.getElementById('empresa-documento').value,
        telefone: document.getElementById('empresa-telefone').value,
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

  const select = document.getElementById('orcamento-cliente');
  const valorAtual = select.value;
  select.innerHTML = '<option value="">Selecione...</option>' +
    estado.clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
  if (valorAtual) select.value = valorAtual;
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

// ---------- Inicialização ----------

(async function iniciar() {
  try {
    await Promise.all([carregarEmpresa(), carregarClientes(), carregarServicos(), carregarOrcamentos()]);
  } catch (erro) {
    mostrarToast('Erro ao carregar dados iniciais: ' + erro.message, true);
  }
})();
