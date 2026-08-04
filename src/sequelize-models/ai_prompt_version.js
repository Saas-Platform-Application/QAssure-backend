const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiPromptVersion = sequelize.define('AiPromptVersion', {
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
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  template: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  system_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  variables: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  default_parameters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  change_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'ai_prompt_versions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
AiPromptVersion.associate = function(models) {
  if (AiPromptVersion._associationsInitialized) return;
  const { Aiprompttemplate, User } = models;

  AiPromptVersion.belongsTo(Aiprompttemplate, { foreignKey: 'prompt_id', as: 'prompt', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AiPromptVersion.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'SET', onUpdate: 'CASCADE' });
  Aiprompttemplate.hasMany(AiPromptVersion, { foreignKey: 'prompt_id', as: 'aipromptversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AiPromptVersion, { foreignKey: 'created_by', as: 'aipromptversions', onDelete: 'SET', onUpdate: 'CASCADE' });
  AiPromptVersion._associationsInitialized = true;
};


module.exports = AiPromptVersion;

