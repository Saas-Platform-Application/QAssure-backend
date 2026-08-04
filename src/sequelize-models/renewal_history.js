const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RenewalHistory = sequelize.define('RenewalHistory', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  license_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  renewal_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  previous_expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  new_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  previous_tier: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  new_tier: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  payment_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  initiated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  initiated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'renewal_history',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
RenewalHistory.associate = function(models) {
  if (RenewalHistory._associationsInitialized) return;
  const { License, Tenant, Invoice, Payment, User } = models;

  RenewalHistory.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalHistory.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalHistory.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalHistory.belongsTo(User, { foreignKey: 'initiated_by', as: 'initiatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(RenewalHistory, { foreignKey: 'license_id', as: 'renewalhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(RenewalHistory, { foreignKey: 'tenant_id', as: 'renewalhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.hasMany(RenewalHistory, { foreignKey: 'invoice_id', as: 'renewalhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Payment.hasMany(RenewalHistory, { foreignKey: 'payment_id', as: 'renewalhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(RenewalHistory, { foreignKey: 'initiated_by', as: 'renewalhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalHistory._associationsInitialized = true;
};


module.exports = RenewalHistory;

