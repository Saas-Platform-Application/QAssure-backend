const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WebhookDeliveryLog = sequelize.define('WebhookDeliveryLog', {
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
  webhook_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  request_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  request_headers: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  request_body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  response_headers: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  response_body: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  attempt_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'webhook_delivery_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
WebhookDeliveryLog.associate = function(models) {
  if (WebhookDeliveryLog._associationsInitialized) return;
  const { Tenant, WebhookConfig } = models;

  WebhookDeliveryLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookDeliveryLog.belongsTo(WebhookConfig, { foreignKey: 'webhook_id', as: 'webhook', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WebhookDeliveryLog, { foreignKey: 'tenant_id', as: 'webhookdeliverylogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookConfig.hasMany(WebhookDeliveryLog, { foreignKey: 'webhook_id', as: 'webhookdeliverylogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookDeliveryLog._associationsInitialized = true;
};


module.exports = WebhookDeliveryLog;

