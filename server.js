// server.js
require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const app = require('./src/app');
const db = require('./src/models'); // Importa o objeto com sequelize e models
const ChampionshipScheduler = require('./src/Schedulers/championshipScheduler');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
  try {
    console.log('🔗 Testando conexão com o banco de dados...');
    await db.sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso.');

    // Sincroniza o banco de dados (em produção, prefira usar migrations)
    await db.sequelize.sync({ force: true });
    console.log('🔄 Banco de dados sincronizado.');

    // Inicia o agendador de tarefas
    ChampionshipScheduler.start();

    // Inicia o servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error('🔥 Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();
