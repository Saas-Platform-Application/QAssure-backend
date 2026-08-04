const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PricingPlan = sequelize.define('PricingPlan', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  license_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  license_tier: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  application: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  base_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD',
  },
  billing_cycle: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'annual',
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  limits: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'pricing_plans',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
PricingPlan.associate = function(models) {
  if (PricingPlan._associationsInitialized) return;
  const { LicenseTier, LicensableApplication } = models;
  
  PricingPlan.belongsTo(LicenseTier, { foreignKey: 'license_tier', targetKey: 'code', as: 'tier', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  PricingPlan.belongsTo(LicensableApplication, { foreignKey: 'application', targetKey: 'code', as: 'applicationRef', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  PricingPlan._associationsInitialized = true;
};

module.exports = PricingPlan;

