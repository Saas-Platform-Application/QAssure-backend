const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowStep = sequelize.define('WorkflowStep', {
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
  step_code: {
    type: DataTypes.STRING(100),
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
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  step_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'task',
  },
  assignee_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  assignee_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  assignee_user_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  assignee_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  assignee_role_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  sla_hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sla_warning_hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sla_escalation_hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  escalation_to: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  escalation_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  escalation_user_id: {
    type: DataTypes.UUID,
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
  requires_attachment: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  available_actions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: ['approve', 'reject'],
  },
  form_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'workflow_steps',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
WorkflowStep.associate = function(models) {
  if (WorkflowStep._associationsInitialized) return;
  const { WorkflowDefinition, Tenant } = models;

  WorkflowStep.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'workflowdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.hasMany(WorkflowStep, { foreignKey: 'workflow_definition_id', as: 'workflowsteps', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowStep, { foreignKey: 'tenant_id', as: 'workflowsteps', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep._associationsInitialized = true;
};


module.exports = WorkflowStep;

