const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowDefinition = sequelize.define('WorkflowDefinition', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'draft',
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  source_module: {
    type: DataTypes.ARRAY(DataTypes.STRING(100)),
    allowNull: true,
    defaultValue: ['platform'],
  },
  source_module_id: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'workflow_definitions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
WorkflowDefinition.associate = function(models) {
  if (WorkflowDefinition._associationsInitialized) return;
  const { Tenant, User } = models;

  WorkflowDefinition.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowDefinition, { foreignKey: 'tenant_id', as: 'workflowdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowDefinition, { foreignKey: 'created_by', as: 'workflowdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowDefinition, { foreignKey: 'updated_by', as: 'updatedWorkflowdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition._associationsInitialized = true;
};


module.exports = WorkflowDefinition;

