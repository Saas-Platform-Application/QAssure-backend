const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SecurityPolicy = sequelize.define('SecurityPolicy', {
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
    unique: true,
  },
  password_min_length: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 8,
  },
  password_require_uppercase: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  password_require_lowercase: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  password_require_numbers: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  password_require_special: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  password_expiry_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 90,
  },
  password_history_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
  },
  mfa_required: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  mfa_methods: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: ['totp'],
  },
  mfa_grace_period_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 7,
  },
  session_timeout_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 480,
  },
  max_concurrent_sessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
  },
  session_extend_on_activity: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  max_login_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
  },
  lockout_duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
  },
  require_captcha_after_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  ip_allowlist_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  ip_allowlist: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  ip_blocklist: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  api_rate_limit_per_minute: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
  },
  api_rate_limit_per_hour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1000,
  },
  require_api_key_for_public: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  audit_log_retention_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2555,
  },
  session_log_retention_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 90,
  },
}, {
  tableName: 'security_policies',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
SecurityPolicy.associate = function(models) {
  if (SecurityPolicy._associationsInitialized) return;
  const { Tenant } = models;

  SecurityPolicy.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SecurityPolicy, { foreignKey: 'tenant_id', as: 'securitypolicies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SecurityPolicy._associationsInitialized = true;
};


module.exports = SecurityPolicy;

