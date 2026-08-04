const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowTransition = sequelize.define('WorkflowTransition', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  workflow_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  from_step_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  to_step_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  condition_expression: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  condition_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  requires_signature: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  requires_comment: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  signature_meaning: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'workflow_transitions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
WorkflowTransition.associate = function(models) {
  if (WorkflowTransition._associationsInitialized) return;
  const { WorkflowDefinition, Tenant, WorkflowStep } = models;

  WorkflowTransition.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'workflowdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTransition.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTransition.belongsTo(WorkflowStep, { foreignKey: 'from_step_id', as: 'fromstep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTransition.belongsTo(WorkflowStep, { foreignKey: 'to_step_id', as: 'tostep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.hasMany(WorkflowTransition, { foreignKey: 'workflow_definition_id', as: 'workflowtransitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowTransition, { foreignKey: 'tenant_id', as: 'workflowtransitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowTransition, { foreignKey: 'from_step_id', as: 'workflowtransitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowTransition, { foreignKey: 'to_step_id', as: 'toStepWorkflowtransitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTransition._associationsInitialized = true;
};


module.exports = WorkflowTransition;

