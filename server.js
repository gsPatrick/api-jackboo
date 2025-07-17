require('dotenv').config();
const express = require('express'); // Mantém express aqui para configurar estáticos
const app = require('./src/app');
const { sequelize } = require('./src/models'); // Para sincronizar o DB na inicialização
const path = require('path'); // Para caminhos estáticos

const PORT = process.env.PORT || 3333;

async function startServer() {
  try {
    await sequelize.sync({ alter: true }); // Pode ser 'force: true' para desenvolvimento, mas 'alter: true' para produção é melhor
    console.log('Banco de dados sincronizado com sucesso.');
    
    // As configurações de arquivos estáticos já estão em src/app.js, evitando duplicação aqui.

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();