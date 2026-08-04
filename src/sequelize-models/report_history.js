const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReportHistory = sequelize.define('ReportHistory', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  report_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  generated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  parameters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  file_format: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'report_history',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
ReportHistory.associate = function(models) {
  if (ReportHistory._associationsInitialized) return;
  const { Tenant, ReportDefinition, ScheduledReport, User } = models;

  ReportHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportHistory.belongsTo(ReportDefinition, { foreignKey: 'report_definition_id', as: 'reportdefinition', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportHistory.belongsTo(ScheduledReport, { foreignKey: 'scheduled_report_id', as: 'scheduledreport', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportHistory.belongsTo(User, { foreignKey: 'executed_by', as: 'executedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ReportHistory, { foreignKey: 'tenant_id', as: 'reporthistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportDefinition.hasMany(ReportHistory, { foreignKey: 'report_definition_id', as: 'reporthistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ScheduledReport.hasMany(ReportHistory, { foreignKey: 'scheduled_report_id', as: 'reporthistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ReportHistory, { foreignKey: 'executed_by', as: 'reporthistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportHistory._associationsInitialized = true;
};


module.exports = ReportHistory;

