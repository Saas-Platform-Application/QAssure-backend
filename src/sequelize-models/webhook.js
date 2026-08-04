const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Webhook = sequelize.define('Webhook', {
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
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  auth_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'none',
  },
  auth_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  events: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'POST',
  },
  headers: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  timeout_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30000,
  },
  retry_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  max_retries: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  retry_delay_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1000,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'active',
  },
  last_triggered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  success_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
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
  tableName: 'webhooks',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Webhook.associate = function(models) {
  if (Webhook._associationsInitialized) return;
  const { Tenant, User, WebhookDelivery } = models;
  
  Webhook.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Webhook.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Webhook.hasMany(WebhookDelivery, { foreignKey: 'webhook_id', as: 'deliveries', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Webhook, { foreignKey: 'tenant_id', as: 'webhooks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Webhook._associationsInitialized = true;
};

module.exports = Webhook;

