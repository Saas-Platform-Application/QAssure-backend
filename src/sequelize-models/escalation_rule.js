const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EscalationRule = sequelize.define('EscalationRule', {
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
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  condition_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  condition_value: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  escalate_to_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  escalate_to_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notification_template_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  check_interval_hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 24,
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'escalation_rules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
EscalationRule.associate = function(models) {
  if (EscalationRule._associationsInitialized) return;
  const { Tenant, User, NotificationTemplate } = models;

  EscalationRule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationRule.belongsTo(User, { foreignKey: 'escalate_to_user_id', as: 'escalatetouser', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationRule.belongsTo(NotificationTemplate, { foreignKey: 'notification_template_id', as: 'notificationtemplate', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(EscalationRule, { foreignKey: 'tenant_id', as: 'escalationrules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(EscalationRule, { foreignKey: 'escalate_to_user_id', as: 'escalationrules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  NotificationTemplate.hasMany(EscalationRule, { foreignKey: 'notification_template_id', as: 'escalationrules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationRule._associationsInitialized = true;
};


module.exports = EscalationRule;

