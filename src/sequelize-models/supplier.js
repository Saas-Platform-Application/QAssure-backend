const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
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
  supplier_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  legal_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  supplier_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  risk_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  primary_contact_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  primary_contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  primary_contact_phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  address_line1: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  address_line2: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  tax_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  duns_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
  },
  approved_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  quality_agreement_signed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  quality_agreement_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  last_audit_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  next_audit_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  certifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  current_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  score_grade: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  products_services: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  workflow_instance_id: {
    type: DataTypes.UUID,
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
  tableName: 'suppliers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Supplier.associate = function(models) {
  if (Supplier._associationsInitialized) return;
  const { Tenant, WorkflowInstance, User } = models;

  Supplier.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Supplier, { foreignKey: 'tenant_id', as: 'suppliers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(Supplier, { foreignKey: 'workflow_instance_id', as: 'suppliers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Supplier, { foreignKey: 'created_by', as: 'suppliers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Supplier, { foreignKey: 'updated_by', as: 'updatedSuppliers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier._associationsInitialized = true;
};


module.exports = Supplier;

