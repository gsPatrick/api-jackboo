// src/Features/Auth/Auth.services.js
const User = require('../../models/User');
const Setting = require('../../models/Setting'); // <-- CORREÇÃO APLICADA AQUI
const { hashPassword, comparePassword } = require('../../Utils/password');
const { generateToken } = require('../../Utils/jwt');

class AuthService {
  // --- Funções de Registro ---
  async registerUser(userData, role = 'user') {
    console.log('[AuthService] Iniciando registro de usuário:', JSON.stringify(userData, null, 2)); // Log do payload recebido

    const { fullName, nickname, email, password, birthDate } = userData;

    try {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.warn(`[AuthService] Email ${email} já em uso.`);
        throw new Error('Este e-mail já está em uso.');
      }
      const existingNickname = await User.findOne({ where: { nickname } });
      if (existingNickname) {
        console.warn(`[AuthService] Apelido ${nickname} já em uso.`);
        throw new Error('Este apelido já está em uso.');
      }
      
      console.log('[AuthService] Hashando senha...');
      const passwordHash = await hashPassword(password);
      console.log('[AuthService] Senha hasheada com sucesso.');

      console.log(`[AuthService] Criando usuário no banco com os seguintes dados:`, {
          fullName,
          nickname,
          email,
          birthDate,
          role,
          accountStatus: 'active', // ou o valor padrão que você usa
          // O passwordHash não deve ser logado explicitamente por segurança
      });

      // --- PONTO CRÍTICO 1: Antes de chamar User.create ---
      // Verifique se `birthDate` está no formato esperado pela sua API/controller
      // console.log('[AuthService] Valor de birthDate antes de criar:', birthDate);

      const user = await User.create({
        fullName,
        nickname,
        email,
        passwordHash, // A senha hasheada
        birthDate,
        role,
        accountStatus: 'active',
      });

      console.log(`[AuthService] Usuário criado com sucesso no banco, ID: ${user.id}`);

      const userJson = user.toJSON();
      delete userJson.passwordHash; // Nunca retorne o hash da senha

      return userJson;
    } catch (error) {
      console.error('[AuthService] Erro durante o registro do usuário:', error);
      // Tenta adicionar mais contexto ao erro, se possível
      if (error.name === 'SequelizeValidationError') {
          console.error('Detalhes da validação Sequelize:', error.errors);
      } else if (error.name === 'SequelizeUniqueConstraintError') {
          console.error('Erro de constraint única:', error.errors);
      }
      // Relança o erro para que o controller possa tratá-lo
      throw error;
    }
  }


  // --- Função de Login ---
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


  // --- Funções CRUD para Admin ---
  async findAllUsers() {
    return User.findAll({ attributes: { exclude: ['passwordHash'] } });
  }

  async findUserById(id) {
    const user = await User.findByPk(id, { attributes: { exclude: ['passwordHash'] } });
    if (!user) throw new Error('Usuário não encontrado.');
    return user;
  }

  async updateUser(id, updateData) {
    const user = await this.findUserById(id);
    if (updateData.password || updateData.passwordHash) {
        delete updateData.password;
        delete updateData.passwordHash;
    }
    await user.update(updateData);
    return user;
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