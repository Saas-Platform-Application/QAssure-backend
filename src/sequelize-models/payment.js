const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  payment_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD',
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pending',
  },
  reference_number: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  bank_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refunded_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  refund_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  receipt_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  receipt_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recorded_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Payment.associate = function(models) {
  if (Payment._associationsInitialized) return;
  const { Tenant, Invoice, User } = models;

  Payment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Payment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Payment, { foreignKey: 'tenant_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Payment, { foreignKey: 'recorded_by', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Payment._associationsInitialized = true;
};


module.exports = Payment;

