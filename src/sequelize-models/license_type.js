const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseType = sequelize.define('LicenseType', {
  code: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'license_types',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicenseType.associate = function(models) {
  if (LicenseType._associationsInitialized) return;
  const { License } = models;
  
  LicenseType.hasMany(License, { foreignKey: 'license_type', targetKey: 'code', as: 'licenses', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  LicenseType._associationsInitialized = true;
};

module.exports = LicenseType;

