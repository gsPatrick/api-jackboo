// config/mercadoPago.js
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN, // Seu Access Token de produção
  // sandbox_access_token: process.env.MP_SANDBOX_ACCESS_TOKEN, // Para desenvolvimento
});

module.exports = mercadopago;