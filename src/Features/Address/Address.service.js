const { Address } = require('../../models');

class AddressService {
  /**
   * Adiciona um novo endereço para um usuário.
   * Se for o primeiro endereço, ele se torna primário.
   * @param {number} userId - ID do usuário.
   * @param {object} addressData - Dados do endereço (street, number, complement, neighborhood, city, state, zipCode).
   * @returns {Address} O endereço criado.
   */
  async createAddress(userId, addressData) {
    const addressesCount = await Address.count({ where: { userId } });
    const isPrimary = addressesCount === 0; // Se for o primeiro endereço, é primário

    const newAddress = await Address.create({
      userId,
      ...addressData,
      isPrimary: isPrimary,
    });

    return newAddress;
  }

  /**
   * Lista todos os endereços de um usuário.
   * @param {number} userId - ID do usuário.
   * @returns {Array<Address>} Lista de endereços.
   */
  async getUserAddresses(userId) {
    return Address.findAll({
      where: { userId },
      order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']] // Primário primeiro
    });
  }

  /**
   * Atualiza um endereço existente de um usuário.
   * @param {number} addressId - ID do endereço a ser atualizado.
   * @param {number} userId - ID do usuário (para segurança).
   * @param {object} updateData - Dados a serem atualizados.
   * @returns {Address} O endereço atualizado.
   */
  async updateAddress(addressId, userId, updateData) {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }
    await address.update(updateData);
    return address;
  }

  /**
   * Deleta um endereço de um usuário.
   * @param {number} addressId - ID do endereço a ser deletado.
   * @param {number} userId - ID do usuário (para segurança).
   * @returns {object} Mensagem de sucesso.
   */
  async deleteAddress(addressId, userId) {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }
    if (address.isPrimary) {
        throw new Error('Não é possível deletar o endereço principal. Defina outro como principal primeiro.');
    }
    await address.destroy();
    return { message: 'Endereço deletado com sucesso.' };
  }

  /**
   * Define um endereço como primário para o usuário.
   * Garante que apenas um endereço seja primário por usuário.
   * @param {number} addressId - ID do endereço a ser definido como primário.
   * @param {number} userId - ID do usuário.
   * @returns {Address} O endereço agora primário.
   */
  async setPrimaryAddress(addressId, userId) {
    return await sequelize.transaction(async (t) => {
      // 1. Desmarca o endereço primário atual do usuário
      await Address.update(
        { isPrimary: false },
        { where: { userId, isPrimary: true }, transaction: t }
      );

      // 2. Marca o novo endereço como primário
      const newPrimary = await Address.findOne({ where: { id: addressId, userId }, transaction: t });
      if (!newPrimary) {
        throw new Error('Endereço não encontrado ou não pertence a este usuário.');
      }
      await newPrimary.update({ isPrimary: true }, { transaction: t });
      return newPrimary;
    });
  }
}

module.exports = new AddressService();
