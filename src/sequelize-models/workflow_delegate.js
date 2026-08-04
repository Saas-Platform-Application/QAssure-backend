const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkflowDelegate = sequelize.define('WorkflowDelegate', {
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
  delegator_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  delegate_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  workflow_definition_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'workflow_delegates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
WorkflowDelegate.associate = function(models) {
  if (WorkflowDelegate._associationsInitialized) return;
  const { Tenant, User, WorkflowDefinition } = models;

  WorkflowDelegate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDelegate.belongsTo(User, { foreignKey: 'delegator_id', as: 'delegator', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDelegate.belongsTo(User, { foreignKey: 'delegate_id', as: 'delegate', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDelegate.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'workflowdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDelegate.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WorkflowDelegate, { foreignKey: 'tenant_id', as: 'workflowdelegates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowDelegate, { foreignKey: 'delegator_id', as: 'workflowdelegates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowDelegate, { foreignKey: 'delegate_id', as: 'delegateWorkflowdelegates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WorkflowDelegate, { foreignKey: 'created_by', as: 'createdWorkflowdelegates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDefinition.hasMany(WorkflowDelegate, { foreignKey: 'workflow_definition_id', as: 'workflowdelegates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowDelegate._associationsInitialized = true;
};


module.exports = WorkflowDelegate;

