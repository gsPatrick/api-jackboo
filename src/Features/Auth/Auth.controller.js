const authService = require('./Auth.service');

class AuthController {
  // --- Controllers de Registro e Login ---
  async register(req, res) {
    try {
      const user = await authService.registerUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async registerAdmin(req, res) {
    try {
      const admin = await authService.registerUser(req.body, 'admin');
      res.status(201).json(admin);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  }

  // --- Controllers CRUD para Admin ---
  async getAllUsers(req, res) {
    try {
      const users = await authService.findAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await authService.findUserById(id);
      res.status(200).json(user);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updatedUser = await authService.updateUser(id, req.body);
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      await authService.deleteUser(id);
      res.status(204).send(); // 204 No Content
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

   async getSettings(req, res) {
        try {
            const settings = await authService.getSettings();
            res.status(200).json(settings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateSetting(req, res) {
        try {
            const { key } = req.params;
            const { value } = req.body;
            if (value === undefined) {
                return res.status(400).json({ message: "O campo 'value' é obrigatório." });
            }
            const setting = await authService.updateSetting(key, value);
            res.status(200).json(setting);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }
}


module.exports = new AuthController();