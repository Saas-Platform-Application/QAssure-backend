const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Aicompletion = sequelize.define('Aicompletion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  module_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  use_case: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  model: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  prompt_template_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  prompt: {
    type: DataTypes.TEXT(100000),

    allowNull: false,
  },
  system_message: {
    type: DataTypes.TEXT(50000),

    allowNull: true,
  },
  temperature: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  max_tokens: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  top_p: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  frequency_penalty: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  presence_penalty: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  stop_sequences: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  response: {
    type: DataTypes.TEXT(200000),

    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  cached: {
    type: DataTypes.BOOLEAN,

    allowNull: false,
  },
  cache_key: {
    type: DataTypes.STRING(64),

    allowNull: true,
  },
  streaming: {
    type: DataTypes.BOOLEAN,

    allowNull: false,
  },
  prompt_tokens: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  completion_tokens: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  total_tokens: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  cost_usd: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT(5000),

    allowNull: true,
  },
  error_code: {
    type: DataTypes.STRING(100),

    allowNull: true,
  },
  fallback_provider: {
    type: DataTypes.STRING,

    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  correlation_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
}, {
  tableName: 'ai_completions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Aicompletion.associate = function(models) {
  if (Aicompletion._associationsInitialized) return;
  const { Tenant, Module, User, Aiprompttemplate } = models;

  Aicompletion.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Aicompletion.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aicompletion.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aicompletion.belongsTo(Aiprompttemplate, { foreignKey: 'prompt_template_id', as: 'prompttemplate', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Tenant.hasMany(Aicompletion, { foreignKey: 'tenant_id', as: 'aicompletions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Module.hasMany(Aicompletion, { foreignKey: 'module_id', as: 'aicompletions', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Aicompletion, { foreignKey: 'user_id', as: 'aicompletions', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aiprompttemplate.hasMany(Aicompletion, { foreignKey: 'prompt_template_id', as: 'aicompletions', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aicompletion._associationsInitialized = true;
};

module.exports = Aicompletion;

