// src/Features/Auth/Auth.services.js

// --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
// Em vez de importar cada modelo separadamente...
// const User = require('../../models/User');
// const Setting = require('../../models/Setting');

// ...importamos o objeto 'db' do index.js dos modelos, que contém todos eles.
const { User, Setting } = require('../../models/index');
// O caminho relativo a partir de 'src/Features/Auth/' para 'src/models/' é '../../models'.
// --- FIM DA CORREÇÃO ---

const { hashPassword, comparePassword } = require('../../Utils/password');
const { generateToken } = require('../../Utils/jwt');

class AuthService {
  // O restante do seu código permanece exatamente o mesmo.

  async registerUser(userData, role = 'user') {
    console.log('[AuthService] Iniciando registro de usuário:', JSON.stringify(userData, null, 2));
    
    // Seu modelo User.js não tinha o campo 'phone'. Se você adicionou, está correto.
    // Se não, remova-o daqui para evitar erros de "coluna desconhecida".
    const { fullName, nickname, email, password, birthDate, phone } = userData; 

    try {
      console.log(`[AuthService] Verificando usuário existente com email: ${email}`);
      console.log(`[AuthService] Chamando User.findOne com where:`, { email });
      
      // AGORA ESTA LINHA FUNCIONA!
      // A variável 'User' importada já está "viva" e conectada ao banco.
      const existingUser = await User.findOne({ where: { email } });
      
      console.log(`[AuthService] Resultado de User.findOne para email ${email}:`, existingUser);

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

      console.log(`[AuthService] Criando usuário no banco...`);
      const user = await User.create({
        fullName,
        nickname,
        email,
        passwordHash,
        birthDate,
        phone, 
        role,
        accountStatus: 'active', // Vamos definir como 'active' direto no registro
      });

      console.log(`[AuthService] Usuário criado com sucesso no banco, ID: ${user.id}`);

      const userJson = user.toJSON();
      delete userJson.passwordHash;

      return userJson;
    } catch (error) {
      console.error('[AuthService] Erro durante o registro do usuário:', error);
      // O seu log de erro personalizado aqui é ótimo.
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