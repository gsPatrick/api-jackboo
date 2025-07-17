const { Model, DataTypes } = require('sequelize');

class Order extends Model {
  static init(sequelize) {
    super.init({
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'canceled'), // Adicionado 'canceled' para clareza
        allowNull: false,
      },
      gatewayOrderId: { // ID da ordem no gateway de pagamento (ex: Mercado Pago preference ID)
        type: DataTypes.STRING,
        allowNull: true,
      },
      // --- NOVOS CAMPOS PARA FRETE ---
      shippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Custo do frete para o pedido.'
      },
      shippingMethod: {
        type: DataTypes.STRING,
        allowNull: true, // Pode ser nulo se não houver produtos físicos
        comment: 'Nome do método de envio selecionado (ex: "Correios PAC").'
      },
      shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: true, // Pode ser nulo se não houver produtos físicos
        comment: 'Detalhes do endereço de entrega usado para este pedido (copia do endereço do usuário).'
      },
      // -----------------------------
    }, {
      sequelize,
      tableName: 'orders',
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    this.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
  }
}

module.exports = Order;
