const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Aiprompttemplate = sequelize.define('Aiprompttemplate', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT(2000),

    allowNull: true,
  },
  use_case: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,

    allowNull: false,
  },
  template: {
    type: DataTypes.TEXT(100000),

    allowNull: false,
  },
  system_message: {
    type: DataTypes.TEXT(50000),

    allowNull: true,
  },
  variables: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  default_parameters: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  recommended_models: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  is_default: {
    type: DataTypes.BOOLEAN,

    allowNull: false,
  },
  usage_count: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  avg_cost_usd: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  avg_latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  success_rate: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
  tags: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  module_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  updated_by: {
    type: DataTypes.UUID,

    allowNull: true,
  },
}, {
  tableName: 'ai_prompt_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Aiprompttemplate.associate = function(models) {
  if (Aiprompttemplate._associationsInitialized) return;
  const { Tenant, User } = models;

  Aiprompttemplate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Aiprompttemplate.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Aiprompttemplate.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Tenant.hasMany(Aiprompttemplate, { foreignKey: 'tenant_id', as: 'aiprompttemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Aiprompttemplate, { foreignKey: 'created_by', as: 'createdAiprompttemplates', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  User.hasMany(Aiprompttemplate, { foreignKey: 'updated_by', as: 'updatedAiprompttemplates', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aiprompttemplate._associationsInitialized = true;
};


module.exports = Aiprompttemplate;