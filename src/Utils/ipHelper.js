// src/Utils/ipHelper.js

/**
 * Tenta obter o IP real do cliente, considerando proxies.
 * @param {object} req - Objeto de requisição do Express.
 * @returns {string} O endereço IP do cliente.
 */
function getClientIp(req) {
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  // Se houver múltiplos IPs em x-forwarded-for, pega o primeiro.
  if (ipAddress && ipAddress.includes(',')) {
    return ipAddress.split(',')[0].trim();
  }
  // Remove "::ffff:" prefixo para IPv4 mapeado em IPv6
  if (ipAddress && ipAddress.startsWith('::ffff:')) {
    return ipAddress.substring(7);
  }
  return ipAddress;
}

module.exports = { getClientIp };
