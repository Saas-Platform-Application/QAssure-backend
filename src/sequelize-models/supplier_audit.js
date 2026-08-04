const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierAudit = sequelize.define('SupplierAudit', {
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
  audit_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  audit_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  auditor_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'scheduled',
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  findings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  report_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'supplier_audits',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
SupplierAudit.associate = function(models) {
  if (SupplierAudit._associationsInitialized) return;
  const { Supplier, Tenant, User, Capa, WorkflowInstance } = models;

  SupplierAudit.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.belongsTo(User, { foreignKey: 'lead_auditor_id', as: 'leadauditor', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(SupplierAudit, { foreignKey: 'supplier_id', as: 'supplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SupplierAudit, { foreignKey: 'tenant_id', as: 'supplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierAudit, { foreignKey: 'lead_auditor_id', as: 'supplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierAudit, { foreignKey: 'created_by', as: 'createdSupplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(SupplierAudit, { foreignKey: 'capa_id', as: 'supplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(SupplierAudit, { foreignKey: 'workflow_instance_id', as: 'supplieraudits', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit._associationsInitialized = true;
};


module.exports = SupplierAudit;

