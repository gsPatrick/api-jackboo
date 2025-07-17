const jwt = require('jsonwebtoken');

// Função para gerar o token JWT
const generateToken = (user) => {
  const payload = {
    id: user.id,
    nickname: user.nickname,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

module.exports = { generateToken };