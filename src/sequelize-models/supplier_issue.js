const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierIssue = sequelize.define('SupplierIssue', {
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
  issue_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  issue_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  severity: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  lot_numbers: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  quantity_affected: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  identified_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  resolved_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'open',
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  capa_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'supplier_issues',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
SupplierIssue.associate = function(models) {
  if (SupplierIssue._associationsInitialized) return;
  const { Supplier, Tenant, Capa, User } = models;

  SupplierIssue.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierIssue.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierIssue.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierIssue.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(SupplierIssue, { foreignKey: 'supplier_id', as: 'supplierissues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SupplierIssue, { foreignKey: 'tenant_id', as: 'supplierissues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(SupplierIssue, { foreignKey: 'capa_id', as: 'supplierissues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierIssue, { foreignKey: 'created_by', as: 'supplierissues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierIssue._associationsInitialized = true;
};


module.exports = SupplierIssue;

