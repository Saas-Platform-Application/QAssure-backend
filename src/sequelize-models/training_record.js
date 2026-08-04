const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingRecord = sequelize.define('TrainingRecord', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'assigned',
  },
  assigned_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
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
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  attempt_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  certificate_issued: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  certificate_issued_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'training_records',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
TrainingRecord.associate = function(models) {
  if (TrainingRecord._associationsInitialized) return;
  const { Tenant, TrainingAssignment, TrainingCourse, User } = models;

  TrainingRecord.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord.belongsTo(TrainingAssignment, { foreignKey: 'assignment_id', as: 'assignment', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord.belongsTo(TrainingCourse, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingRecord, { foreignKey: 'tenant_id', as: 'trainingrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.hasMany(TrainingRecord, { foreignKey: 'assignment_id', as: 'trainingrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.hasMany(TrainingRecord, { foreignKey: 'course_id', as: 'trainingrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingRecord, { foreignKey: 'user_id', as: 'trainingrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingRecord, { foreignKey: 'instructor_id', as: 'instructorTrainingrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord._associationsInitialized = true;
};


module.exports = TrainingRecord;

