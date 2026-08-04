const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseActivation = sequelize.define('LicenseActivation', {
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
  activation_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  activation_status: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  instance_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  device_fingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  deactivated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  error_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'license_activations',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicenseActivation.associate = function(models) {
  if (LicenseActivation._associationsInitialized) return;
  const { License, Tenant, User } = models;

  LicenseActivation.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseActivation.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseActivation.belongsTo(User, { foreignKey: 'performed_by', as: 'performedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.hasMany(LicenseActivation, { foreignKey: 'license_id', as: 'licenseactivations', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(LicenseActivation, { foreignKey: 'tenant_id', as: 'licenseactivations', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(LicenseActivation, { foreignKey: 'performed_by', as: 'licenseactivations', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseActivation._associationsInitialized = true;
};


module.exports = LicenseActivation;

