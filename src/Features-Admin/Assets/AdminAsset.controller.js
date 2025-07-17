const adminAssetService = require('./AdminAsset.service');

class AdminAssetController {
  async createAsset(req, res) {
    try {
      const asset = await adminAssetService.createAsset(req.user.id, req.file, req.body);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listAssets(req, res) {
    try {
      const result = await adminAssetService.listAssets(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  
  async updateAsset(req, res) {
    try {
      const { id } = req.params;
      const asset = await adminAssetService.updateAsset(id, req.body);
      res.status(200).json(asset);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async deleteAsset(req, res) {
    try {
      const { id } = req.params;
      await adminAssetService.deleteAsset(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = new AdminAssetController();