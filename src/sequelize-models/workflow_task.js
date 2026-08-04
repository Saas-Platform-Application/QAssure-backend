const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowTask = sequelize.define('WorkflowTask', {
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
  workflow_instance_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  workflow_step_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  assigned_user_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  assigned_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  assigned_role_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
  },
  due_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  warning_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  escalated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  escalated_to: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  action_taken: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  delegated_from: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  delegation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  signature_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'workflow_tasks',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
WorkflowTask.associate = function(models) {
  if (WorkflowTask._associationsInitialized) return;
  const { Tenant, WorkflowInstance, WorkflowStep, User } = models;

  WorkflowTask.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(WorkflowStep, { foreignKey: 'workflow_step_id', as: 'workflowstep', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedto', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(User, { foreignKey: 'escalated_to', as: 'escalatedto', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(User, { foreignKey: 'completed_by', as: 'completedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask.belongsTo(User, { foreignKey: 'delegated_from', as: 'delegatedfrom', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowTask, { foreignKey: 'tenant_id', as: 'workflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(WorkflowTask, { foreignKey: 'workflow_instance_id', as: 'workflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowStep.hasMany(WorkflowTask, { foreignKey: 'workflow_step_id', as: 'workflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowTask, { foreignKey: 'assigned_to', as: 'workflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowTask, { foreignKey: 'assigned_by', as: 'assignedWorkflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowTask, { foreignKey: 'escalated_to', as: 'escalatedToWorkflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowTask, { foreignKey: 'completed_by', as: 'completedWorkflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowTask, { foreignKey: 'delegated_from', as: 'delegatedFromWorkflowtasks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowTask._associationsInitialized = true;
};


module.exports = WorkflowTask;

