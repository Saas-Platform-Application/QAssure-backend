const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScheduledReport = sequelize.define('ScheduledReport', {
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
  report_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  schedule_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  schedule_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  recipients: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  output_format: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pdf',
  },
  include_charts: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  last_run_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  next_run_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'scheduled_reports',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
ScheduledReport.associate = function(models) {
  if (ScheduledReport._associationsInitialized) return;
  const { Tenant, ReportDefinition, User } = models;

  ScheduledReport.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ScheduledReport.belongsTo(ReportDefinition, { foreignKey: 'report_definition_id', as: 'reportdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ScheduledReport.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ScheduledReport, { foreignKey: 'tenant_id', as: 'scheduledreports', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportDefinition.hasMany(ScheduledReport, { foreignKey: 'report_definition_id', as: 'scheduledreports', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ScheduledReport, { foreignKey: 'created_by', as: 'scheduledreports', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ScheduledReport._associationsInitialized = true;
};


module.exports = ScheduledReport;

