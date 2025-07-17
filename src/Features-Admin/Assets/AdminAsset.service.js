// src/Features-Admin/Assets/AdminAsset.service.js
const { AdminAsset, User } = require('../../../models');
const { Op } = require('sequelize');

class AdminAssetService {
  async createAsset(uploadedByUserId, file, assetData) {
    if (!file) throw new Error('Nenhum arquivo enviado.');
    
    const { name, description } = assetData;
    if (!name || !description) throw new Error("Nome e descrição do asset são obrigatórios para guiar a IA.");

    const url = `/uploads/admin-assets/${file.filename}`;

    return AdminAsset.create({
      name,
      url,
      description,
      type: 'image',
      uploadedByUserId,
    });
  }

  async listAssets(filters = {}) {
    const { page = 1, limit = 20, name } = filters;
    const whereClause = name ? { name: { [Op.iLike]: `%${name}%` } } : {};
    
    const { count, rows } = await AdminAsset.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'nickname'] }],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });
    return { totalItems: count, assets: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }
  
  async updateAsset(id, updateData) {
      const asset = await AdminAsset.findByPk(id);
      if (!asset) throw new Error('Asset não encontrado.');
      await asset.update(updateData);
      return asset;
  }

  async deleteAsset(id) {
    const asset = await AdminAsset.findByPk(id);
    if (!asset) throw new Error('Asset não encontrado.');
    await asset.destroy(); // O hook cuidará de deletar o arquivo
    return { message: 'Asset deletado com sucesso.' };
  }
}

module.exports = new AdminAssetService();