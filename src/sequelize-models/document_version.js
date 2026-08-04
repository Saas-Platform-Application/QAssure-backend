const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentVersion = sequelize.define('DocumentVersion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  document_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  version_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  major_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  minor_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'draft',
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  change_summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'document_versions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
DocumentVersion.associate = function(models) {
  if (DocumentVersion._associationsInitialized) return;
  const { Document, Tenant, User, WorkflowInstance } = models;

  DocumentVersion.belongsTo(Document, { foreignKey: 'document_id', as: 'document', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.belongsTo(WorkflowInstance, { foreignKey: 'workflow_instance_id', as: 'workflowinstance', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentVersion, { foreignKey: 'document_id', as: 'documentversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentVersion, { foreignKey: 'tenant_id', as: 'documentversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentVersion, { foreignKey: 'approved_by', as: 'documentversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentVersion, { foreignKey: 'created_by', as: 'createdDocumentversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  WorkflowInstance.hasMany(DocumentVersion, { foreignKey: 'workflow_instance_id', as: 'documentversions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion._associationsInitialized = true;
};


module.exports = DocumentVersion;

