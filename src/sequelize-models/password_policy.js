const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PasswordPolicy = sequelize.define('PasswordPolicy', {
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
  min_length: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 12,
  },
  max_length: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 128,
  },
  require_uppercase: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  require_lowercase: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  require_numbers: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  require_special_chars: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  special_chars_allowed: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  },
  password_history_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 12,
  },
  password_expiry_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 90,
  },
  password_expiry_warning_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 14,
  },
  max_failed_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  lockout_duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  session_timeout_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 480,
  },
  concurrent_sessions_allowed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  mfa_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  mfa_required_for_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  prevent_username_in_password: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  prevent_common_passwords: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'password_policies',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
PasswordPolicy.associate = function(models) {
  if (PasswordPolicy._associationsInitialized) return;
  const { Tenant, User } = models;

  PasswordPolicy.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PasswordPolicy.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PasswordPolicy.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(PasswordPolicy, { foreignKey: 'tenant_id', as: 'passwordpolicies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(PasswordPolicy, { foreignKey: 'created_by', as: 'passwordpolicies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(PasswordPolicy, { foreignKey: 'updated_by', as: 'updatedPasswordpolicies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PasswordPolicy._associationsInitialized = true;
};


module.exports = PasswordPolicy;

