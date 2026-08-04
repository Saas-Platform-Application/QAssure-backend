const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WebhookConfig = sequelize.define('WebhookConfig', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  url: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  http_method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'POST',
  },
  auth_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'none',
  },
  auth_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  events: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false,
  },
  custom_headers: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  retry_delay_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 60,
  },
  timeout_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  last_triggered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  failure_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'webhook_configs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
WebhookConfig.associate = function(models) {
  if (WebhookConfig._associationsInitialized) return;
  const { Tenant, User } = models;

  WebhookConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookConfig.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WebhookConfig, { foreignKey: 'tenant_id', as: 'webhookconfigs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(WebhookConfig, { foreignKey: 'created_by', as: 'webhookconfigs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookConfig._associationsInitialized = true;
};


module.exports = WebhookConfig;

