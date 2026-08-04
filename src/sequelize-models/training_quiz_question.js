const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingQuizQuestion = sequelize.define('TrainingQuizQuestion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  question_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'multiple_choice',
  },
  options: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  correct_answers: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'training_quiz_questions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
TrainingQuizQuestion.associate = function(models) {
  if (TrainingQuizQuestion._associationsInitialized) return;
  const { TrainingCourse, Tenant } = models;

  TrainingQuizQuestion.belongsTo(TrainingCourse, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingQuizQuestion.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.hasMany(TrainingQuizQuestion, { foreignKey: 'course_id', as: 'trainingquizquestions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingQuizQuestion, { foreignKey: 'tenant_id', as: 'trainingquizquestions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingQuizQuestion._associationsInitialized = true;
};


module.exports = TrainingQuizQuestion;

