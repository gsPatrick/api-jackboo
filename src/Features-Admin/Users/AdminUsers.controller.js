// src/Features-Admin/Users/AdminUsers.controller.js
const adminUsersService = require('./AdminUsers.service');

class AdminUsersController {
    async listUsers(req, res, next) {
        try {
            const result = await adminUsersService.listAllUsers();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminUsersController();