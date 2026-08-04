const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingQuizAttempt = sequelize.define('TrainingQuizAttempt', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  assignment_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  attempt_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  answers: {
    type: DataTypes.JSONB,
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
  time_spent_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'training_quiz_attempts',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
TrainingQuizAttempt.associate = function(models) {
  if (TrainingQuizAttempt._associationsInitialized) return;
  const { TrainingAssignment, User, Tenant } = models;

  TrainingQuizAttempt.belongsTo(TrainingAssignment, { foreignKey: 'assignment_id', as: 'assignment', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingQuizAttempt.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingQuizAttempt.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingAssignment.hasMany(TrainingQuizAttempt, { foreignKey: 'assignment_id', as: 'trainingquizattempts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingQuizAttempt, { foreignKey: 'user_id', as: 'trainingquizattempts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingQuizAttempt, { foreignKey: 'tenant_id', as: 'trainingquizattempts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingQuizAttempt._associationsInitialized = true;
};


module.exports = TrainingQuizAttempt;

