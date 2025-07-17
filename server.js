// server.js
const app = require('./src/app');
const db = require('./src/models'); // Importa o objeto db do diretório de modelos
const ChampionshipScheduler = require('./src/Schedulers/championshipScheduler');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
  try {
    // Usa a instância 'sequelize' do objeto 'db' importado
    console.log('🔗 Testando conexão com o banco de dados...');
    await db.sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso.');

    // Sincroniza o banco de dados
    await db.sequelize.sync({ alter: true });
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