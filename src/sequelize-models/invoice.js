const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
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
  license_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft',
  },
  invoice_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  voided_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  period_start: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  period_end: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  discount_reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  amount_paid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  amount_due: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD',
  },
  billing_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  billing_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  billing_address: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pdf_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Invoice.associate = function(models) {
  if (Invoice._associationsInitialized) return;
  const { Tenant, License, User } = models;

  Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Invoice, { foreignKey: 'tenant_id', as: 'invoices', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(Invoice, { foreignKey: 'license_id', as: 'invoices', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Invoice, { foreignKey: 'created_by', as: 'invoices', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Invoice, { foreignKey: 'updated_by', as: 'updatedInvoices', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice._associationsInitialized = true;
};


module.exports = Invoice;

