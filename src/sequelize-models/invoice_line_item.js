const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceLineItem = sequelize.define('InvoiceLineItem', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  line_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  item_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1,
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
  },
  line_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'invoice_line_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
InvoiceLineItem.associate = function(models) {
  if (InvoiceLineItem._associationsInitialized) return;
  const { Invoice, PricingPlan, License } = models;

  InvoiceLineItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  InvoiceLineItem.belongsTo(PricingPlan, { foreignKey: 'pricing_plan_id', as: 'pricingplan', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  InvoiceLineItem.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Invoice.hasMany(InvoiceLineItem, { foreignKey: 'invoice_id', as: 'invoicelineitems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PricingPlan.hasMany(InvoiceLineItem, { foreignKey: 'pricing_plan_id', as: 'invoicelineitems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(InvoiceLineItem, { foreignKey: 'license_id', as: 'invoicelineitems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  InvoiceLineItem._associationsInitialized = true;
};


module.exports = InvoiceLineItem;

