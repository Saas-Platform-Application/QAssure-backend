const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeDocument = sequelize.define('KnowledgeDocument', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  word_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  chunk_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'knowledge_documents',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
KnowledgeDocument.associate = function(models) {
  if (KnowledgeDocument._associationsInitialized) return;
  const { KnowledgeCollection, Tenant, User } = models;

  KnowledgeDocument.belongsTo(KnowledgeCollection, { foreignKey: 'collection_id', as: 'collection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KnowledgeDocument.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KnowledgeDocument.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'SET', onUpdate: 'CASCADE' });
  KnowledgeCollection.hasMany(KnowledgeDocument, { foreignKey: 'collection_id', as: 'knowledgedocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(KnowledgeDocument, { foreignKey: 'tenant_id', as: 'knowledgedocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(KnowledgeDocument, { foreignKey: 'created_by', as: 'knowledgedocuments', onDelete: 'SET', onUpdate: 'CASCADE' });
  KnowledgeDocument._associationsInitialized = true;
};


module.exports = KnowledgeDocument;

