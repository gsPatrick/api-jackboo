const { User, Character } = require('../../models');
const { uploadAdminAsset } = require('../../Utils/multerConfig'); // Importar para upload
const JACKBOO_USER_ID = 1; // ID do "usuário sistema"

class AdminCharactersService {
  /**
   * Lista todos os personagens pertencentes ao usuário sistema (oficiais).
   */
  async listOfficialCharacters() {
    return Character.findAll({
      where: { userId: JACKBOO_USER_ID },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Cria um novo personagem oficial.
   * Admin faz upload de uma imagem que será tanto original quanto gerada.
   * @param {object} characterData - Dados do personagem (name, description, etc.).
   * @param {object} file - Arquivo de imagem do personagem.
   */
  async createOfficialCharacter(characterData, file) {
    const { name, description, traits } = characterData;

    if (!file) {
      throw new Error('A imagem do personagem é obrigatória.');
    }
    // A URL será do diretório de assets do admin
    const characterImageUrl = `/uploads/admin-assets/${file.filename}`;
    
    // Para um personagem oficial, o desenho original e o gerado são os mesmos (upload do admin)
    const originalDrawingUrl = characterImageUrl;
    const generatedCharacterUrl = characterImageUrl;

    const character = await Character.create({
      userId: JACKBOO_USER_ID,
      name,
      description: description || null,
      traits: traits || null,
      originalDrawingUrl,
      generatedCharacterUrl,
    });

    return character;
  }

  /**
   * Busca um personagem oficial por ID.
   */
  async findOfficialCharacterById(id) {
    const character = await Character.findOne({
      where: { id, userId: JACKBOO_USER_ID }
    });
    if (!character) throw new Error('Personagem oficial não encontrado.');
    return character;
  }
  
  /**
   * Atualiza um personagem oficial.
   * @param {number} id - ID do personagem.
   * @param {object} updateData - Dados a serem atualizados.
   * @param {object} [file] - Novo arquivo de imagem (opcional).
   */
  async updateOfficialCharacter(id, updateData, file) {
    const character = await this.findOfficialCharacterById(id);
    
    if (file) {
      // Se uma nova imagem for enviada, atualiza as URLs
      // TODO: Lógica para deletar a imagem antiga do storage
      const newUrl = `/uploads/admin-assets/${file.filename}`; // Novo caminho para assets admin
      updateData.originalDrawingUrl = newUrl;
      updateData.generatedCharacterUrl = newUrl;
    }

    await character.update(updateData);
    return character;
  }

  /**
   * Deleta um personagem oficial.
   */
  async deleteOfficialCharacter(id) {
    const character = await this.findOfficialCharacterById(id);
    // TODO: Lógica para deletar a imagem do storage (originalDrawingUrl e generatedCharacterUrl)
    await character.destroy();
    return { message: 'Personagem oficial deletado com sucesso.' };
  }
}

module.exports = new AdminCharactersService();