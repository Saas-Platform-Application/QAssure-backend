const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentLink = sequelize.define('DocumentLink', {
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
  source_document_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  target_document_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  link_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'document_links',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
DocumentLink.associate = function(models) {
  if (DocumentLink._associationsInitialized) return;
  const { Tenant, Document, User } = models;

  DocumentLink.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentLink.belongsTo(Document, { foreignKey: 'source_document_id', as: 'sourcedocument', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentLink.belongsTo(Document, { foreignKey: 'target_document_id', as: 'targetdocument', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentLink.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentLink, { foreignKey: 'tenant_id', as: 'documentlinks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentLink, { foreignKey: 'source_document_id', as: 'documentlinks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentLink, { foreignKey: 'target_document_id', as: 'targetDocumentDocumentlinks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentLink, { foreignKey: 'created_by', as: 'documentlinks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentLink._associationsInitialized = true;
};


module.exports = DocumentLink;

