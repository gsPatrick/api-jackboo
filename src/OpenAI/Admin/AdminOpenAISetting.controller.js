const adminOpenAISettingService = require('./AdminOpenAISetting.service');

class AdminOpenAISettingController {
  // --- CRUD de Configurações OpenAI ---
  async listSettings(req, res) {
    try {
      const settings = await adminOpenAISettingService.listSettings();
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar configurações da OpenAI.', error: error.message });
    }
  }

  async getSettingByType(req, res) {
    try {
      const { type } = req.params;
      const setting = await adminOpenAISettingService.findSettingByType(type);
      res.status(200).json(setting);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async createOrUpdateSetting(req, res) {
    try {
      const { type } = req.params;
      const { baseAssetIds, ...settingData } = req.body; // baseAssetIds é o array de IDs
      const setting = await adminOpenAISettingService.createOrUpdateSetting(type, settingData, baseAssetIds);
      res.status(200).json(setting);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteSetting(req, res) {
    try {
      const { type } = req.params;
      const result = await adminOpenAISettingService.deleteSetting(type);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  // --- Listagem de Histórico de Geração ---
  async listGeneratedImageLogs(req, res) {
    try {
      const result = await adminOpenAISettingService.listGeneratedImageLogs(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar histórico de gerações de imagem.', error: error.message });
    }
  }

  async createOrUpdateSetting(req, res) {
    try {
      const { type } = req.params;
      const { baseAssetIds, ...settingData } = req.body; // Separa os IDs do resto dos dados
      const setting = await adminOpenAISettingService.createOrUpdateSetting(type, settingData, baseAssetIds);
      res.status(200).json(setting);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new AdminOpenAISettingController();