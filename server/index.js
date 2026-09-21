require('dotenv').config();

const path = require('path');
const express = require('express');

require('./db');

const empresaRoutes = require('./routes/empresa');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const orcamentosRoutes = require('./routes/orcamentos');
const itensCatalogoRoutes = require('./routes/itensCatalogo');
const propostasRoutes = require('./routes/propostas');
const assistenteRoutes = require('./routes/assistente');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/empresa', empresaRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/itens-catalogo', itensCatalogoRoutes);
app.use('/api/propostas', propostasRoutes);
app.use('/api/assistente', assistenteRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(PORTA, () => {
  console.log(`ES3 - Módulo de Orçamento rodando em http://localhost:${PORTA}`);
});
