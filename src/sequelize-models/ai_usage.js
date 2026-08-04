const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Aiusage = sequelize.define('Aiusage', {
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

    allowNull: true,
  },
  provider: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  model: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  period_start: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  period_type: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  request_count: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  success_count: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  failure_count: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  cached_count: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  total_prompt_tokens: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  total_completion_tokens: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  total_tokens: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  total_cost_usd: {
    type: DataTypes.DECIMAL,

    allowNull: false,
  },
  avg_latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  p50_latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  p95_latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  p99_latency_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  cache_hit_rate: {
    type: DataTypes.DECIMAL,

    allowNull: true,
  },
}, {
  tableName: 'ai_usage',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Aiusage.associate = function(models) {
  if (Aiusage._associationsInitialized) return;
  const { Tenant, Module, User } = models;

  Aiusage.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Aiusage.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aiusage.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Tenant.hasMany(Aiusage, { foreignKey: 'tenant_id', as: 'aiusage', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Module.hasMany(Aiusage, { foreignKey: 'module_id', as: 'aiusage', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Aiusage, { foreignKey: 'user_id', as: 'aiusage', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Aiusage._associationsInitialized = true;
};

module.exports = Aiusage;

