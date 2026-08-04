const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EscalationHistory = sequelize.define('EscalationHistory', {
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
  escalation_rule_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  entity_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  escalated_to_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  escalated_to_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  notification_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'escalation_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
EscalationHistory.associate = function(models) {
  if (EscalationHistory._associationsInitialized) return;
  const { Tenant, EscalationRule, User, Notification } = models;

  EscalationHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationHistory.belongsTo(EscalationRule, { foreignKey: 'escalation_rule_id', as: 'escalationrule', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationHistory.belongsTo(User, { foreignKey: 'escalated_to_user_id', as: 'escalatedtouser', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationHistory.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(EscalationHistory, { foreignKey: 'tenant_id', as: 'escalationhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationRule.hasMany(EscalationHistory, { foreignKey: 'escalation_rule_id', as: 'escalationhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(EscalationHistory, { foreignKey: 'escalated_to_user_id', as: 'escalationhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Notification.hasMany(EscalationHistory, { foreignKey: 'notification_id', as: 'escalationhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EscalationHistory._associationsInitialized = true;
};


module.exports = EscalationHistory;

