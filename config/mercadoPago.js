const mercadopago = require('mercadopago');

const mp = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_TOKEN
});

module.exports = mp;
