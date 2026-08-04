const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseUsage = sequelize.define('LicenseUsage', {
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
  period_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  period_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  active_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  active_projects: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ai_tokens_used: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  storage_used_gb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'license_usage',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicenseUsage.associate = function(models) {
  if (LicenseUsage._associationsInitialized) return;
  const { License, Tenant } = models;

  LicenseUsage.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseUsage.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(LicenseUsage, { foreignKey: 'license_id', as: 'licenseusage', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(LicenseUsage, { foreignKey: 'tenant_id', as: 'licenseusage', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseUsage._associationsInitialized = true;
};


module.exports = LicenseUsage;

