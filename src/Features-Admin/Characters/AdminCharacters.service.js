// src/Features-Admin/Characters/AdminCharacters.service.js
const { Character } = require('../../models');
const { deleteFile } = require('../../Utils/FileHelper'); // Importar o helper para deletar arquivos

// Defina o ID do usuário "Sistema" ou "Admin Principal"
// É uma boa prática ter isso em um arquivo de configuração (.env), mas aqui funciona.
const SYSTEM_USER_ID = 1; 

class AdminCharactersService {
  /**
   * Lista todos os personagens pertencentes ao usuário sistema (oficiais).
   */
  async listOfficialCharacters() {
    return Character.findAll({
      where: { userId: SYSTEM_USER_ID },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Cria um novo personagem oficial.
   * O admin faz o upload de uma imagem que será usada como a imagem "final".
   * @param {object} characterData - Dados do personagem (name, description, etc.).
   * @param {object} file - Arquivo de imagem do personagem (do multer).
   */
  async createOfficialCharacter(characterData, file) {
    const { name, description, traits } = characterData;

    if (!file) {
      throw new Error('A imagem do personagem é obrigatória.');
    }
    // A URL será relativa à pasta pública, para ser servida corretamente.
    const characterImageUrl = `/uploads/admin-assets/${file.filename}`;
    
    // Para um personagem oficial, o desenho original e o gerado são o mesmo.
    // Usamos o mesmo URL para ambos para manter a consistência do modelo.
    const newCharacter = await Character.create({
      userId: SYSTEM_USER_ID,
      name,
      description: description || null,
      traits: traits ? JSON.parse(traits) : null, // Garante que traits seja um JSON
      originalDrawingUrl: characterImageUrl,
      generatedCharacterUrl: characterImageUrl,
    });

    return newCharacter;
  }

  /**
   * Busca um personagem oficial por ID para garantir que ele pertence ao sistema.
   */
  async findOfficialCharacterById(id) {
    const character = await Character.findOne({
      where: { id, userId: SYSTEM_USER_ID }
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
      // Se uma nova imagem for enviada, deleta a antiga e atualiza as URLs.
      const oldImageUrl = character.generatedCharacterUrl;
      await deleteFile(oldImageUrl); // Deleta o arquivo antigo do servidor
      
      const newUrl = `/uploads/admin-assets/${file.filename}`;
      updateData.originalDrawingUrl = newUrl;
      updateData.generatedCharacterUrl = newUrl;
    }

    if(updateData.traits && typeof updateData.traits === 'string') {
        updateData.traits = JSON.parse(updateData.traits);
    }

    await character.update(updateData);
    return character;
  }

  /**
   * Deleta um personagem oficial e seu arquivo de imagem associado.
   */
  async deleteOfficialCharacter(id) {
    const character = await this.findOfficialCharacterById(id);
    // O hook `afterDestroy` no model Character já cuida de deletar o arquivo.
    await character.destroy();
    return { message: 'Personagem oficial deletado com sucesso.' };
  }
}

module.exports = new AdminCharactersService();