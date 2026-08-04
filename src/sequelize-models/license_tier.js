const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseTier = sequelize.define('LicenseTier', {
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
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_projects: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_ai_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_storage_gb: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  is_active: {
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
  tableName: 'license_tiers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicenseTier.associate = function(models) {
  if (LicenseTier._associationsInitialized) return;
  const { License, PricingPlan } = models;
  
  LicenseTier.hasMany(License, { foreignKey: 'tier', targetKey: 'code', as: 'licenses', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  LicenseTier.hasMany(PricingPlan, { foreignKey: 'license_tier', targetKey: 'code', as: 'pricingPlans', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  LicenseTier._associationsInitialized = true;
};

module.exports = LicenseTier;

