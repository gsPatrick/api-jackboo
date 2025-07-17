'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('settings', [{
      key: 'free_character_limit',
      value: '1', // Valor padrão inicial
      description: 'Número máximo de personagens que um usuário não-assinante pode criar.',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('settings', { key: 'free_character_limit' });
  }
};