const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationTemplate = sequelize.define('NotificationTemplate', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  code: {
    type: DataTypes.STRING(100),
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
  title_template: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  message_template: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  email_subject_template: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  email_body_template: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  default_priority: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'normal',
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: ['in_app', 'email'],
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'notification_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
NotificationTemplate.associate = function(models) {
  if (NotificationTemplate._associationsInitialized) return;
  const { Tenant } = models;

  NotificationTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(NotificationTemplate, { foreignKey: 'tenant_id', as: 'notificationtemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationTemplate._associationsInitialized = true;
};


module.exports = NotificationTemplate;

