const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectActivityLog = sequelize.define('ProjectActivityLog', {
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
  project_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  activity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'project_activity_log',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
ProjectActivityLog.associate = function(models) {
  if (ProjectActivityLog._associationsInitialized) return;
  const { Tenant, Project, User } = models;

  ProjectActivityLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectActivityLog.belongsTo(Project, { foreignKey: 'project_id', as: 'project', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectActivityLog.belongsTo(User, { foreignKey: 'performed_by', as: 'performedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ProjectActivityLog, { foreignKey: 'tenant_id', as: 'projectactivitylog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.hasMany(ProjectActivityLog, { foreignKey: 'project_id', as: 'projectactivitylog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectActivityLog, { foreignKey: 'performed_by', as: 'projectactivitylog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectActivityLog._associationsInitialized = true;
};


module.exports = ProjectActivityLog;

