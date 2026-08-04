const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SecuritySetting = sequelize.define('SecuritySetting', {
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
    unique: true,
  },
  session_timeout_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 480,
  },
  idle_timeout_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  force_single_session: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ip_whitelist_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ip_whitelist: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  ip_blacklist: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  geo_restriction_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  allowed_countries: {
    type: DataTypes.ARRAY(DataTypes.STRING(2)),
    allowNull: true,
  },
  audit_retention_years: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 7,
  },
  audit_all_reads: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  audit_sensitive_fields: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  esig_require_pin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  esig_pin_length: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
  },
  esig_require_reason: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  esig_session_timeout_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  api_rate_limit_per_minute: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  },
  api_key_expiry_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notify_on_failed_login: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  notify_on_password_change: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  notify_on_new_device: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  notify_on_permission_change: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  security_contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  compliance_mode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'fda_part11',
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'security_settings',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
SecuritySetting.associate = function(models) {
  if (SecuritySetting._associationsInitialized) return;
  const { Tenant, User } = models;

  SecuritySetting.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SecuritySetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SecuritySetting, { foreignKey: 'tenant_id', as: 'securitysettings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SecuritySetting, { foreignKey: 'updated_by', as: 'securitysettings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SecuritySetting._associationsInitialized = true;
};


module.exports = SecuritySetting;

