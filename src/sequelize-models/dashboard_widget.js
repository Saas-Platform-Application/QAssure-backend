const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DashboardWidget = sequelize.define('DashboardWidget', {
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
  widget_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  data_source: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  source_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  query_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  size: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'medium',
  },
  chart_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
}, {
  tableName: 'dashboard_widgets',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
DashboardWidget.associate = function(models) {
  if (DashboardWidget._associationsInitialized) return;
  const { Tenant } = models;

  DashboardWidget.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DashboardWidget, { foreignKey: 'tenant_id', as: 'dashboardwidgets', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DashboardWidget._associationsInitialized = true;
};


module.exports = DashboardWidget;

