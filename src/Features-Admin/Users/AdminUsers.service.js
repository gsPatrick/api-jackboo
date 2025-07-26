// /workspace/src/Features-Admin/Users/AdminUsers.service.js

// ✅ CORREÇÃO: Importe o seu modelo do banco de dados aqui.
// O caminho para o seu arquivo de modelo pode ser diferente. Ajuste conforme necessário.
const AdminUsers = require('../models/AdminUsers.model'); 

const listUsers = async () => {
    // Agora "AdminUsers" existe e pode ser usado.
    const users = await AdminUsers.find({});
    return users;
};

module.exports = {
    listUsers,
};