const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KpiDefinition = sequelize.define('KpiDefinition', {
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
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  module: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  calculation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  query_config: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  target_value: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
  },
  target_direction: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  warning_threshold: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
  },
  critical_threshold: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  decimal_places: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'kpi_definitions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
KpiDefinition.associate = function(models) {
  if (KpiDefinition._associationsInitialized) return;
  const { Tenant } = models;

  KpiDefinition.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(KpiDefinition, { foreignKey: 'tenant_id', as: 'kpidefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KpiDefinition._associationsInitialized = true;
};


module.exports = KpiDefinition;

