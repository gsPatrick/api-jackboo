// server.js
const app = require('./src/app');
// Altere a importação para pegar o objeto 'db' inteiro.
const db = require('./src/models');
const ChampionshipScheduler = require('./src/Schedulers/championshipScheduler');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
  try {
    // Agora, use db.sequelize, que é a forma garantida de acessar a instância.
    console.log('🔗 Testando conexão com o banco de dados...');
    await db.sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso.');

    // Use `alter: true` para desenvolvimento. Considere migrations para produção.
    await db.sequelize.sync({ alter: true });
    console.log('🔄 Banco de dados sincronizado.');

    // Inicia o agendador
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