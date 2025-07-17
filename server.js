// server.js
const app = require('./src/app');
const { sequelize } = require('./src/models'); // <-- Alterado
const ChampionshipScheduler = require('./src/Schedulers/championshipScheduler');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
  try {
    // 1. Apenas autentica e sincroniza. Os modelos já estão carregados.
    console.log('🔗 Testando conexão com o banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso.');

    // Use `alter: true` para desenvolvimento. Considere migrations para produção.
    await sequelize.sync({ alter: true });
    console.log('🔄 Banco de dados sincronizado.');

    // 2. Inicia o agendador
    ChampionshipScheduler.start();

    // 3. Inicia o servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error('🔥 Falha ao iniciar o servidor:', error);
    process.exit(1); 
  }
};

startServer();