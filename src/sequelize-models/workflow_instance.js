const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowInstance = sequelize.define('WorkflowInstance', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  entity_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelled_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  workflow_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  current_step_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  started_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  context: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  source_module: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'platform',
  },
  source_module_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'workflow_instances',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
WorkflowInstance.associate = function(models) {
  if (WorkflowInstance._associationsInitialized) return;
  const { Tenant, WorkflowDefinition, WorkflowStep, User } = models;

  WorkflowInstance.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'workflowdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.belongsTo(WorkflowStep, { foreignKey: 'current_step_id', as: 'currentstep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.belongsTo(User, { foreignKey: 'cancelled_by', as: 'cancelledby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.belongsTo(User, { foreignKey: 'started_by', as: 'startedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowInstance, { foreignKey: 'tenant_id', as: 'workflowinstances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.hasMany(WorkflowInstance, { foreignKey: 'workflow_definition_id', as: 'workflowinstances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowInstance, { foreignKey: 'current_step_id', as: 'workflowinstances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowInstance, { foreignKey: 'cancelled_by', as: 'workflowinstances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowInstance, { foreignKey: 'started_by', as: 'startedWorkflowinstances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance._associationsInitialized = true;
};


module.exports = WorkflowInstance;

