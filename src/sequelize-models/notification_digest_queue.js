const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationDigestQueue = sequelize.define('NotificationDigestQueue', {
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
  notification_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  digest_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  scheduled_for: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  is_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notification_digest_queue',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
NotificationDigestQueue.associate = function(models) {
  if (NotificationDigestQueue._associationsInitialized) return;
  const { User, Tenant, Notification } = models;

  NotificationDigestQueue.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationDigestQueue.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationDigestQueue.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(NotificationDigestQueue, { foreignKey: 'user_id', as: 'notificationdigestqueue', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(NotificationDigestQueue, { foreignKey: 'tenant_id', as: 'notificationdigestqueue', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Notification.hasMany(NotificationDigestQueue, { foreignKey: 'notification_id', as: 'notificationdigestqueue', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationDigestQueue._associationsInitialized = true;
};


module.exports = NotificationDigestQueue;

