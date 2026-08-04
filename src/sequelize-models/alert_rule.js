const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlertRule = sequelize.define('AlertRule', {
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
  trigger_event: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  trigger_conditions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  notification_template_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notify_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  notify_user_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
  },
  notify_owner: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: ['in_app'],
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'alert_rules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
AlertRule.associate = function(models) {
  if (AlertRule._associationsInitialized) return;
  const { Tenant, NotificationTemplate } = models;

  AlertRule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AlertRule.belongsTo(NotificationTemplate, { foreignKey: 'notification_template_id', as: 'notificationtemplate', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(AlertRule, { foreignKey: 'tenant_id', as: 'alertrules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationTemplate.hasMany(AlertRule, { foreignKey: 'notification_template_id', as: 'alertrules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AlertRule._associationsInitialized = true;
};


module.exports = AlertRule;

