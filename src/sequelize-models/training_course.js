const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingCourse = sequelize.define('TrainingCourse', {
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
  course_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  course_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  duration_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  passing_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 80,
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  prerequisites: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  required_for_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  required_for_departments: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'draft',
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '1.0',
  },
  requires_recertification: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  recertification_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  content_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  document_id: {
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
  tableName: 'training_courses',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
TrainingCourse.associate = function(models) {
  if (TrainingCourse._associationsInitialized) return;
  const { Tenant, Document, User } = models;

  TrainingCourse.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.belongsTo(Document, { foreignKey: 'document_id', as: 'document', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingCourse, { foreignKey: 'tenant_id', as: 'trainingcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(TrainingCourse, { foreignKey: 'document_id', as: 'trainingcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingCourse, { foreignKey: 'created_by', as: 'trainingcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingCourse, { foreignKey: 'updated_by', as: 'updatedTrainingcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse._associationsInitialized = true;
};


module.exports = TrainingCourse;

