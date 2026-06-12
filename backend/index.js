'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3050;

// Lê a origem permitida do pentest.config.json para manter sincronia com o tester
function getAllowedOrigin() {
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'pentest.config.json'), 'utf8')
    );
    return config.front_origin || 'http://localhost:5173';
  } catch (_) {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }
}

app.use(cors({ origin: getAllowedOrigin(), credentials: true }));
app.use(express.json());

// Rota raiz — teste de conectividade
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'portal-crm-backend', port: PORT });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Adicione suas rotas aqui

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
  console.log(`CORS liberado para: ${getAllowedOrigin()}`);
});
