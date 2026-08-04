const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiPromptTestCase = sequelize.define('AiPromptTestCase', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  prompt_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
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
  input_variables: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  expected_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'ai_prompt_test_cases',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
AiPromptTestCase.associate = function(models) {
  if (AiPromptTestCase._associationsInitialized) return;
  const { Aiprompttemplate, Tenant, User } = models;

  AiPromptTestCase.belongsTo(Aiprompttemplate, { foreignKey: 'prompt_id', as: 'prompt', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AiPromptTestCase.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AiPromptTestCase.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'SET', onUpdate: 'CASCADE' });
  Aiprompttemplate.hasMany(AiPromptTestCase, { foreignKey: 'prompt_id', as: 'aiprompttestcases', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(AiPromptTestCase, { foreignKey: 'tenant_id', as: 'aiprompttestcases', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AiPromptTestCase, { foreignKey: 'created_by', as: 'aiprompttestcases', onDelete: 'SET', onUpdate: 'CASCADE' });
  AiPromptTestCase._associationsInitialized = true;
};


module.exports = AiPromptTestCase;

