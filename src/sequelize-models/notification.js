const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  notification_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'normal',
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  entity_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  action_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_dismissed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  dismissed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  channels_sent: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
Notification.associate = function(models) {
  if (Notification._associationsInitialized) return;
  const { Tenant, User } = models;

  Notification.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Notification, { foreignKey: 'tenant_id', as: 'notifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Notification._associationsInitialized = true;
};


module.exports = Notification;

