const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventSubscription = sequelize.define('EventSubscription', {
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
  module_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  subscriber_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  event_pattern: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  delivery_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'kafka',
  },
  callback_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  kafka_topic: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  filters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'active',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'event_subscriptions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
EventSubscription.associate = function(models) {
  if (EventSubscription._associationsInitialized) return;
  const { Tenant, User } = models;
  
  EventSubscription.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EventSubscription.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Tenant.hasMany(EventSubscription, { foreignKey: 'tenant_id', as: 'eventSubscriptions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EventSubscription._associationsInitialized = true;
};

module.exports = EventSubscription;

