const jwt = require('jsonwebtoken');
const User = require('../../models/User'); // Ajuste o caminho conforme sua estrutura

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adiciona os dados do usuário (id, role) ao request
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

// Middleware para verificar se o usuário é um administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Acesso negado. Rota exclusiva para administradores.' });
  }
};
const isSubscriber = async (req, res, next) => {
  // A role 'admin' tem acesso a tudo
  if (req.user.role === 'admin') {
    return next();
  }

  // A role 'subscriber' também tem acesso
  if (req.user.role === 'subscriber') {
    return next();
  }
  
  // Se não for admin nem subscriber, nega o acesso
  return res.status(403).json({ message: 'Acesso negado. Apenas assinantes podem realizar esta ação.' });
};

module.exports = { isAuthenticated, isAdmin, isSubscriber }; // Exportar o novo middleware