'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3050;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3051', credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Adicione suas rotas aqui

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
