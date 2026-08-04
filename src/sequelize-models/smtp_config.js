const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmtpConfig = sequelize.define('SmtpConfig', {
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
  host: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 587,
  },
  secure: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  password_encrypted: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  from_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  from_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  reply_to_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  max_connections: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
  },
  rate_limit_per_minute: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  last_tested_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_test_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'smtp_configs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
SmtpConfig.associate = function(models) {
  if (SmtpConfig._associationsInitialized) return;
  const { Tenant } = models;

  SmtpConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SmtpConfig, { foreignKey: 'tenant_id', as: 'smtpconfigs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SmtpConfig._associationsInitialized = true;
};


module.exports = SmtpConfig;

