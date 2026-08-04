const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: ['read'],
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'active',
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  left_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invited_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  invited_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'project_members',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
ProjectMember.associate = function(models) {
  if (ProjectMember._associationsInitialized) return;
  const { Tenant, Project, User } = models;

  ProjectMember.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMember.belongsTo(User, { foreignKey: 'invited_by', as: 'invitedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ProjectMember, { foreignKey: 'tenant_id', as: 'projectmembers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'projectmembers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'projectmembers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectMember, { foreignKey: 'invited_by', as: 'invitedProjectmembers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMember._associationsInitialized = true;
};


module.exports = ProjectMember;

