const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WebhookDelivery = sequelize.define('WebhookDelivery', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  webhook_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  event_type: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  response_body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  next_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'webhook_deliveries',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
WebhookDelivery.associate = function(models) {
  if (WebhookDelivery._associationsInitialized) return;
  const { Webhook, Tenant } = models;
  
  WebhookDelivery.belongsTo(Webhook, { foreignKey: 'webhook_id', as: 'webhook', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookDelivery.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(WebhookDelivery, { foreignKey: 'tenant_id', as: 'webhookDeliveries', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WebhookDelivery._associationsInitialized = true;
};

module.exports = WebhookDelivery;

