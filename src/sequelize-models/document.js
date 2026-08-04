const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
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
  document_number: {
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
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  document_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'draft',
  },
  current_version_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  next_review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  obsolete_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  workflow_instance_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  custom_fields: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
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
  tableName: 'documents',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Document.associate = function(models) {
  if (Document._associationsInitialized) return;
  const { Tenant, DocumentCategory, User, WorkflowInstance } = models;

  Document.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.belongsTo(DocumentCategory, { foreignKey: 'category_id', as: 'category', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Document, { foreignKey: 'tenant_id', as: 'documents', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCategory.hasMany(Document, { foreignKey: 'category_id', as: 'categoryDocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Document, { foreignKey: 'owner_id', as: 'ownedDocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Document, { foreignKey: 'created_by', as: 'createdDocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Document, { foreignKey: 'updated_by', as: 'updatedDocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(Document, { foreignKey: 'workflow_instance_id', as: 'documents', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document._associationsInitialized = true;
};


module.exports = Document;

