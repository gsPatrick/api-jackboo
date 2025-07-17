// src/Features/Auth/Auth.services.js
const User = require('../../models/User');
const Setting = require('../../models/Setting'); // <-- CORREÇÃO APLICADA AQUI
const { hashPassword, comparePassword } = require('../../Utils/password');
const { generateToken } = require('../../Utils/jwt');

class AuthService {
  // --- Funções de Registro ---
  async registerUser(userData, role = 'user') {
    const { fullName, nickname, email, password, birthDate } = userData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Este e-mail já está em uso.');
    }
    const existingNickname = await User.findOne({ where: { nickname } });
    if (existingNickname) {
        throw new Error('Este apelido já está em uso.');
    }
    
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      fullName,
      nickname,
      email,
      passwordHash,
      birthDate,
      role,
      accountStatus: 'active',
    });

    const userJson = user.toJSON();
    delete userJson.passwordHash;

    return userJson;
  }

  // --- Função de Login ---
  async login(email, password) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas.');
    }

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