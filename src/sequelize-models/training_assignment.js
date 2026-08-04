const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingAssignment = sequelize.define('TrainingAssignment', {
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
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  curriculum_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  extended_due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  extension_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'assigned',
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  waived_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  waived_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  waiver_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  workflow_instance_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'training_assignments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
TrainingAssignment.associate = function(models) {
  if (TrainingAssignment._associationsInitialized) return;
  const { Tenant, TrainingCourse, TrainingCurriculum, User, WorkflowInstance } = models;

  TrainingAssignment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(TrainingCourse, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(TrainingCurriculum, { foreignKey: 'curriculum_id', as: 'curriculum', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(User, { foreignKey: 'waived_by', as: 'waivedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingAssignment, { foreignKey: 'tenant_id', as: 'trainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.hasMany(TrainingAssignment, { foreignKey: 'course_id', as: 'trainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCurriculum.hasMany(TrainingAssignment, { foreignKey: 'curriculum_id', as: 'trainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingAssignment, { foreignKey: 'user_id', as: 'trainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingAssignment, { foreignKey: 'assigned_by', as: 'assignedTrainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingAssignment, { foreignKey: 'waived_by', as: 'waivedTrainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(TrainingAssignment, { foreignKey: 'workflow_instance_id', as: 'trainingassignments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment._associationsInitialized = true;
};


module.exports = TrainingAssignment;

