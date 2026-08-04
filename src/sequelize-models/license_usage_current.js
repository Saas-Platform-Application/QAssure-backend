const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseUsageCurrent = sequelize.define('LicenseUsageCurrent', {
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
    unique: true,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  current_users: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  current_projects: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  current_ai_tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  current_storage_gb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  current_api_calls: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  period_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  period_resets_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'license_usage_current',
  underscored: true,
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
LicenseUsageCurrent.associate = function(models) {
  if (LicenseUsageCurrent._associationsInitialized) return;
  const { License, Tenant } = models;

  LicenseUsageCurrent.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseUsageCurrent.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(LicenseUsageCurrent, { foreignKey: 'license_id', as: 'licenseusagecurrent', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(LicenseUsageCurrent, { foreignKey: 'tenant_id', as: 'licenseusagecurrent', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseUsageCurrent._associationsInitialized = true;
};


module.exports = LicenseUsageCurrent;

