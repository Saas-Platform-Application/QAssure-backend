const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KpiValue = sequelize.define('KpiValue', {
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
  kpi_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  period_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
  },
  previous_value: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
  },
  change_percent: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  calculated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'kpi_values',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
KpiValue.associate = function(models) {
  if (KpiValue._associationsInitialized) return;
  const { Tenant, KpiDefinition } = models;

  KpiValue.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KpiValue.belongsTo(KpiDefinition, { foreignKey: 'kpi_definition_id', as: 'kpidefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(KpiValue, { foreignKey: 'tenant_id', as: 'kpivalues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KpiDefinition.hasMany(KpiValue, { foreignKey: 'kpi_definition_id', as: 'kpivalues', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KpiValue._associationsInitialized = true;
};


module.exports = KpiValue;

