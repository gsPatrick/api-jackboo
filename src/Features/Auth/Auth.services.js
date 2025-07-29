// src/Features/Auth/Auth.services.js

const { User, Setting } = require('../../models/index');
const { hashPassword, comparePassword } = require('../../Utils/password');
const { generateToken } = require('../../Utils/jwt');
const { generateSlug } = require('../../Utils/slugGenerator'); // NOVO: Importar gerador de slug

class AuthService {
  async registerUser(userData, role = 'user') {
    console.log('[AuthService] Iniciando registro de usuário:', JSON.stringify(userData, null, 2));
    
    const { fullName, nickname, email, password, birthDate, phone } = userData; 

    try {
      console.log(`[AuthService] Verificando usuário existente com email: ${email}`);
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        console.warn(`[AuthService] Email ${email} já em uso.`);
        throw new Error('Este e-mail já está em uso.');
      }
      
      console.log(`[AuthService] Verificando nickname existente: ${nickname}`);
      const existingNickname = await User.findOne({ where: { nickname } });
      if (existingNickname) {
        console.warn(`[AuthService] Apelido ${nickname} já em uso.`);
        throw new Error('Este apelido já está em uso.');
      }
      
      console.log('[AuthService] Hashando senha...');
      const passwordHash = await hashPassword(password);
      console.log('[AuthService] Senha hasheada com sucesso.');

      // NOVO: Gerar slug a partir do nickname
      const slug = await generateSlug(nickname);

      console.log(`[AuthService] Criando usuário no banco...`);
      const user = await User.create({
        fullName,
        nickname,
        email,
        passwordHash,
        birthDate,
        phone, 
        role,
        accountStatus: 'active',
        slug, // Adicionar o slug
        avatarUrl: '/images/default-avatar.png', // Definir um avatar padrão
      });

      console.log(`[AuthService] Usuário criado com sucesso no banco, ID: ${user.id}`);

      const userJson = user.toJSON();
      delete userJson.passwordHash;

      return userJson;
    } catch (error) {
      console.error('[AuthService] Erro durante o registro do usuário:', error);
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
          console.error('Detalhes do erro Sequelize:', error.errors);
      }
      throw error;
    }
  }

  async login(email, password) {
    console.log(`[AuthService] Tentando login para o email: ${email}`);
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.warn(`[AuthService] Tentativa de login falhou: usuário não encontrado para o email ${email}`);
      throw new Error('Credenciais inválidas.');
    }
    
    console.log('[AuthService] Usuário encontrado. Comparando senhas...');
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      console.warn(`[AuthService] Tentativa de login falhou: senha incorreta para o email ${email}`);
      throw new Error('Credenciais inválidas.');
    }
    
    console.log(`[AuthService] Login bem-sucedido para o usuário ${user.nickname} (ID: ${user.id})`);
    const token = generateToken(user);
    const userJson = user.toJSON();
    delete userJson.passwordHash;

    return { user: userJson, token };
  }

  // --- Funções CRUD para Admin e Usuário (próprio perfil) ---
  // A função findUserById agora será usada tanto por admin (para ver qualquer um)
  // quanto pelo usuário logado (para ver a si mesmo).
  async findUserById(id) {
    // Incluir 'slug', 'avatarUrl', 'bio', 'phone' na busca
    const user = await User.findByPk(id, { 
      attributes: { exclude: ['passwordHash'] } 
    });
    if (!user) throw new Error('Usuário não encontrado.');
    return user;
  }

  // Função para atualizar usuário, agora também capaz de atualizar campos como 'nickname', 'fullName', 'email', 'phone', 'avatarUrl', 'bio'
  async updateUser(id, updateData) {
    const user = await this.findUserById(id);

    // Impedir alteração de role por esta rota
    if (updateData.role && user.role !== updateData.role) {
      delete updateData.role; // Não permite mudar o role
      console.warn(`[AuthService] Tentativa de alterar role do usuário ${id} ignorada.`);
    }

    // Impedir alteração de senha por esta rota (seria uma rota separada ou admin)
    if (updateData.password || updateData.passwordHash) {
        delete updateData.password;
        delete updateData.passwordHash;
        console.warn(`[AuthService] Tentativa de alterar senha do usuário ${id} ignorada.`);
    }

    // Se o nickname for atualizado, recalcular o slug
    if (updateData.nickname && updateData.nickname !== user.nickname) {
        updateData.slug = await generateSlug(updateData.nickname);
    }
    
    await user.update(updateData);
    return user;
  }

  async findAllUsers() {
    return User.findAll({ attributes: { exclude: ['passwordHash'] } });
  }

  async deleteUser(id) {
    const user = await this.findUserById(id);
    await user.destroy();
    return { message: 'Usuário deletado com sucesso.' };
  }

  // --- Funções de Configurações ---
  async getSettings() {
        return Setting.findAll();
  }

  async updateSetting(key, value) {
      const setting = await Setting.findByPk(key);
      if (!setting) {
          throw new Error(`Configuração com a chave '${key}' não encontrada.`);
      }
      setting.value = value;
      await setting.save();
      return setting;
  }
}

module.exports = new AuthService();