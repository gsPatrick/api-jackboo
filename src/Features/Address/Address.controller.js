const addressService = require('./Address.service');

class AddressController {
  async createAddress(req, res) {
    try {
      const address = await addressService.createAddress(req.user.id, req.body);
      res.status(201).json(address);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getMyAddresses(req, res) {
    try {
      const addresses = await addressService.getUserAddresses(req.user.id);
      res.status(200).json(addresses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateAddress(req, res) {
    try {
      const { id } = req.params;
      const address = await addressService.updateAddress(id, req.user.id, req.body);
      res.status(200).json(address);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteAddress(req, res) {
    try {
      const { id } = req.params;
      await addressService.deleteAddress(id, req.user.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async setPrimaryAddress(req, res) {
    try {
      const { id } = req.params; // ID do endereço a ser tornado primário
      const address = await addressService.setPrimaryAddress(id, req.user.id);
      res.status(200).json(address);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new AddressController();
