// Exemplo: 20231027100000-add_slug_bio_phone_avatar_to_users.js
'use strict';

const { generateSlug } = require('../src/Utils/slugGenerator'); // Certifique-se que o caminho está correto!
const { User } = require('../src/models'); // Importar o modelo User diretamente para uso nos hooks

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar coluna 'slug'
    await queryInterface.addColumn('users', 'slug', {
      type: Sequelize.STRING,
      allowNull: true, // Temporariamente true para permitir valores nulos enquanto populamos
      unique: true,
    });

    // Adicionar coluna 'bio'
    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Modificar coluna 'phone' para ser allowNull: true (se já existir)
    // Se a coluna 'phone' já foi criada como `allowNull: false`, você pode precisar alterá-la para `true` temporariamente
    // para permitir a atualização de usuários existentes sem telefone.
    // Ou se ela já foi criada como `allowNull: true`, esta etapa pode ser ignorada.
    // Estou assumindo que ela pode não existir ou pode ser necessária a alteração para NULL.
    // Ajuste conforme o estado atual da sua tabela.
    await queryInterface.changeColumn('users', 'phone', {
        type: Sequelize.STRING,
        allowNull: true, // Alterado para permitir nulos, para usuários existentes sem telefone
    });

    // Adicionar valor padrão para 'avatar_url' se for o caso
    // Note: 'avatar_url' é o nome da coluna no banco, 'avatarUrl' é no modelo.
    // Se você já tem `defaultValue` no modelo, mas a coluna pode ter nulos em registros existentes,
    // esta linha pode ajudar a preencher os valores.
    // Se a coluna não existe, você precisa adicioná-la primeiro:
    // await queryInterface.addColumn('users', 'avatar_url', {
    //   type: Sequelize.STRING,
    //   defaultValue: '/images/default-avatar.png',
    //   allowNull: true, // Ou false, dependendo da sua regra.
    // });
    // Se ela já existe, mas sem padrão ou com nulos:
    await queryInterface.changeColumn('users', 'avatar_url', {
        type: Sequelize.STRING,
        defaultValue: '/images/default-avatar.png',
        allowNull: true, // Ou false, se todos os novos registros deverão ter um avatar.
    });


    // Populando os slugs e phone para usuários existentes
    // Importante: Este script pode precisar de mais memória ou tempo para muitos usuários.
    // Considere um script de "data migration" separado para bases muito grandes.
    const users = await queryInterface.sequelize.query(
      `SELECT id, nickname FROM users WHERE slug IS NULL OR phone IS NULL;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const user of users) {
      const newSlug = await generateSlug(user.nickname);
      await queryInterface.sequelize.query(
        `UPDATE users SET slug = :slug, phone = :phone, avatar_url = :avatarUrl WHERE id = :id;`,
        {
          replacements: {
            slug: newSlug,
            // Para 'phone', se for nulo, defina um valor padrão ou deixe como está, se já for allowNull
            phone: user.phone || '00000000000', // Um valor padrão para telefone se for nulo e não pode ser nulo
            avatarUrl: user.avatar_url || '/images/default-avatar.png', // Definir avatar padrão
            id: user.id
          },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }
    
    // Após popular os slugs, você pode alterar 'allowNull' de volta para 'false' se desejar
    // Isto garante que novos usuários sempre tenham um slug.
    await queryInterface.changeColumn('users', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverte as alterações em caso de rollback
    await queryInterface.removeColumn('users', 'slug');
    await queryInterface.removeColumn('users', 'bio');
    // Para 'phone' e 'avatar_url', você precisaria reverter para o estado original,
    // o que pode ser complexo se houver dados. Removendo a modificação ou revertendo o padrão.
    // Exemplo:
    await queryInterface.changeColumn('users', 'phone', {
        type: Sequelize.STRING,
        allowNull: false, // Voltar para false se era assim originalmente
    });
    // Se 'avatar_url' foi adicionado, pode ser removido, se só alterado, reverter o padrão.
    // await queryInterface.removeColumn('users', 'avatar_url');
  }
};