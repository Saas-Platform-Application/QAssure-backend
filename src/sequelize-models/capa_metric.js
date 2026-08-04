const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CapaMetric = sequelize.define('CapaMetric', {
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
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total_opened: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_closed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_overdue: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  corrective_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  preventive_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  by_source: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  by_department: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  avg_days_to_close: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  effectiveness_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  calculated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'capa_metrics',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
CapaMetric.associate = function(models) {
  if (CapaMetric._associationsInitialized) return;
  const { Tenant } = models;

  CapaMetric.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(CapaMetric, { foreignKey: 'tenant_id', as: 'capametrics', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaMetric._associationsInitialized = true;
};


module.exports = CapaMetric;

