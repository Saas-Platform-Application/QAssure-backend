const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiPromptTestResult = sequelize.define('AiPromptTestResult', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  test_case_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  prompt_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  input_variables: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cost_usd: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  latency_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  run_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'ai_prompt_test_results',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
AiPromptTestResult.associate = function(models) {
  if (AiPromptTestResult._associationsInitialized) return;
  const { AiPromptTestCase, User } = models;

  AiPromptTestResult.belongsTo(AiPromptTestCase, { foreignKey: 'test_case_id', as: 'testcase', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AiPromptTestResult.belongsTo(User, { foreignKey: 'run_by', as: 'runby', onDelete: 'SET', onUpdate: 'CASCADE' });
  AiPromptTestCase.hasMany(AiPromptTestResult, { foreignKey: 'test_case_id', as: 'aiprompttestresults', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AiPromptTestResult, { foreignKey: 'run_by', as: 'aiprompttestresults', onDelete: 'SET', onUpdate: 'CASCADE' });
  AiPromptTestResult._associationsInitialized = true;
};


module.exports = AiPromptTestResult;

