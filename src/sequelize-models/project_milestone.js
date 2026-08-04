const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMilestone = sequelize.define('ProjectMilestone', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
  milestone_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'project_milestones',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
ProjectMilestone.associate = function(models) {
  if (ProjectMilestone._associationsInitialized) return;
  const { Tenant, Project, User  } = models;

  ProjectMilestone.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMilestone.belongsTo(Project, { foreignKey: 'project_id', as: 'project', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMilestone.belongsTo(ProjectMilestone, { foreignKey: 'depends_on', as: 'dependson', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMilestone.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMilestone.belongsTo(User, { foreignKey: 'completed_by', as: 'completedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ProjectMilestone, { foreignKey: 'tenant_id', as: 'projectmilestones', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.hasMany(ProjectMilestone, { foreignKey: 'project_id', as: 'projectmilestones', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectMilestone, { foreignKey: 'owner_id', as: 'projectmilestones', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ProjectMilestone, { foreignKey: 'completed_by', as: 'completedProjectmilestones', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ProjectMilestone._associationsInitialized = true;
};


module.exports = ProjectMilestone;

