const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowHistory = sequelize.define('WorkflowHistory', {
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
  signature_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  workflow_instance_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  from_step_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  to_step_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  from_step_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  to_step_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  performed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  performed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'workflow_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
WorkflowHistory.associate = function(models) {
  if (WorkflowHistory._associationsInitialized) return;
  const { Tenant, WorkflowInstance, WorkflowStep, User } = models;

  WorkflowHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowHistory.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowHistory.belongsTo(WorkflowStep, { foreignKey: 'from_step_id', as: 'fromstep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowHistory.belongsTo(WorkflowStep, { foreignKey: 'to_step_id', as: 'tostep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowHistory, { foreignKey: 'tenant_id', as: 'workflowhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(WorkflowHistory, { foreignKey: 'workflow_instance_id', as: 'workflowhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowHistory, { foreignKey: 'from_step_id', as: 'workflowhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowHistory, { foreignKey: 'to_step_id', as: 'toStepWorkflowhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowHistory, { foreignKey: 'performed_by', as: 'workflowhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowHistory._associationsInitialized = true;
};


module.exports = WorkflowHistory;

