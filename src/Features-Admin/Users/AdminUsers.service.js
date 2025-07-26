// src/Features-Admin/Users/AdminUsers.service.js
const { User } = require('../../models');
const { Op } = require('sequelize');

class AdminUsersService {
    async listAllUsers() {
        // Exclui o usuário do sistema da contagem/lista
        const users = await User.findAll({
            where: { isSystemUser: { [Op.ne]: true } },
            order: [['createdAt', 'DESC']]
        });
        return { users };
    }
}

module.exports = new AdminUsersService();