const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  in_app_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  email_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  email_digest: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'instant',
  },
  category_preferences: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      capa: { in_app: true, email: true },
      document: { in_app: true, email: true },
      training: { in_app: true, email: true },
      supplier: { in_app: true, email: true },
      workflow: { in_app: true, email: true },
      system: { in_app: true, email: false }
    },
  },
  quiet_hours_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  quiet_hours_start: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  quiet_hours_end: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'UTC',
  },
}, {
  tableName: 'notification_preferences',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
NotificationPreference.associate = function(models) {
  if (NotificationPreference._associationsInitialized) return;
  const { User, Tenant } = models;

  NotificationPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationPreference.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(NotificationPreference, { foreignKey: 'user_id', as: 'notificationpreferences', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(NotificationPreference, { foreignKey: 'tenant_id', as: 'notificationpreferences', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationPreference._associationsInitialized = true;
};


module.exports = NotificationPreference;

