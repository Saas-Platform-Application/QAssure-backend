const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Capa = sequelize.define('Capa', {
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
  capa_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  capa_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  priority: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'medium',
  },
  risk_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  problem_statement: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  immediate_action: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  containment_action: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  root_cause_method: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  contributing_factors: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  corrective_action: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  preventive_action: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verification_method: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verification_results: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  effectiveness_criteria: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  effectiveness_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  effectiveness_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'draft',
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  identified_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  closed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  source_record_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  source_record_id: {
    type: DataTypes.UUID,
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
  tableName: 'capas',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Capa.associate = function(models) {
  if (Capa._associationsInitialized) return;
  const { Tenant, User, WorkflowInstance } = models;

  Capa.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Capa, { foreignKey: 'tenant_id', as: 'capas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Capa, { foreignKey: 'owner_id', as: 'ownedCapas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Capa, { foreignKey: 'created_by', as: 'createdCapas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Capa, { foreignKey: 'updated_by', as: 'updatedCapas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(Capa, { foreignKey: 'workflow_instance_id', as: 'capas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa._associationsInitialized = true;
};


module.exports = Capa;

