// server.js
const app = require('./src/app');
const database = require('./src/database'); // Importa nossa instância da classe Database

const PORT = process.env.PORT || 3333;

// Função assíncrona para controlar a inicialização
const startServer = async () => {
  try {
    // 1. PRIMEIRO: Conecta e sincroniza o banco de dados.
    // O servidor vai esperar aqui até que tudo esteja pronto.
    await database.connect();

    // 2. DEPOIS: Inicia o servidor Express.
    // Agora temos certeza que todos os models estão prontos para serem usados.
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error('🔥 Falha ao iniciar o servidor. O processo será encerrado.');
    // Se a conexão com o banco falhar, o servidor não deve iniciar.
    process.exit(1); 
  }
};

// Inicia todo o processo
startServer();