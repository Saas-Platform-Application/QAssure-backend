const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReportDefinition = sequelize.define('ReportDefinition', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  report_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  module: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  chart_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'report_definitions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
ReportDefinition.associate = function(models) {
  if (ReportDefinition._associationsInitialized) return;
  const { Tenant, User } = models;

  ReportDefinition.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportDefinition.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportDefinition.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ReportDefinition, { foreignKey: 'tenant_id', as: 'reportdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ReportDefinition, { foreignKey: 'owner_id', as: 'reportdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ReportDefinition, { foreignKey: 'created_by', as: 'createdReportdefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ReportDefinition._associationsInitialized = true;
};


module.exports = ReportDefinition;

