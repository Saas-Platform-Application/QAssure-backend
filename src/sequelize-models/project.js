const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
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
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  project_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'planning',
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'medium',
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  target_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  actual_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  device_class: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  regulatory_pathway: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  submission_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  regulatory_body: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  submission_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'projects',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Project.associate = function(models) {
  if (Project._associationsInitialized) return;
  const { Tenant, User } = models;

  Project.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Project, { foreignKey: 'tenant_id', as: 'projects', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Project, { foreignKey: 'owner_id', as: 'projects', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Project, { foreignKey: 'updated_by', as: 'updatedProjects', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Project._associationsInitialized = true;
};


module.exports = Project;

