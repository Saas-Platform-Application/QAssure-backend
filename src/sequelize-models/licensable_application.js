const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicensableApplication = sequelize.define('LicensableApplication', {
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
  requires_platform: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'licensable_applications',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicensableApplication.associate = function(models) {
  if (LicensableApplication._associationsInitialized) return;
  const { License, PricingPlan } = models;
  
  LicensableApplication.hasMany(License, { foreignKey: 'application', targetKey: 'code', as: 'licenses', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  LicensableApplication.hasMany(PricingPlan, { foreignKey: 'application', targetKey: 'code', as: 'pricingPlans', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  LicensableApplication._associationsInitialized = true;
};

module.exports = LicensableApplication;

