const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RenewalNotification = sequelize.define('RenewalNotification', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  license_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  notification_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  days_before_expiry: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  channel: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: 'email',
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  delivered: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  recipient_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  recipient_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'renewal_notifications',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
RenewalNotification.associate = function(models) {
  if (RenewalNotification._associationsInitialized) return;
  const { License, Tenant, User } = models;

  RenewalNotification.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalNotification.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalNotification.belongsTo(User, { foreignKey: 'recipient_user_id', as: 'recipientuser', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(RenewalNotification, { foreignKey: 'license_id', as: 'renewalnotifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(RenewalNotification, { foreignKey: 'tenant_id', as: 'renewalnotifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(RenewalNotification, { foreignKey: 'recipient_user_id', as: 'renewalnotifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RenewalNotification._associationsInitialized = true;
};


module.exports = RenewalNotification;

