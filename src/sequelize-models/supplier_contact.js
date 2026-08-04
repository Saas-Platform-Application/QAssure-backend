const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierContact = sequelize.define('SupplierContact', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  mobile: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  contact_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'supplier_contacts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
SupplierContact.associate = function(models) {
  if (SupplierContact._associationsInitialized) return;
  const { Supplier, Tenant } = models;

  SupplierContact.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierContact.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(SupplierContact, { foreignKey: 'supplier_id', as: 'suppliercontacts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SupplierContact, { foreignKey: 'tenant_id', as: 'suppliercontacts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierContact._associationsInitialized = true;
};


module.exports = SupplierContact;

