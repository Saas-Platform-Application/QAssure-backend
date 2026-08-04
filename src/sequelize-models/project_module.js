const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectModule = sequelize.define('ProjectModule', {
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
  module_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  enabled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  disabled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  enabled_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'project_modules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
ProjectModule.associate = function(models) {
  if (ProjectModule._associationsInitialized) return;
  const { Tenant, Project, User } = models;

  ProjectModule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectModule.belongsTo(Project, { foreignKey: 'project_id', as: 'project', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectModule.belongsTo(User, { foreignKey: 'enabled_by', as: 'enabledby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ProjectModule, { foreignKey: 'tenant_id', as: 'projectmodules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.hasMany(ProjectModule, { foreignKey: 'project_id', as: 'projectmodules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectModule, { foreignKey: 'enabled_by', as: 'projectmodules', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectModule._associationsInitialized = true;
};


module.exports = ProjectModule;

