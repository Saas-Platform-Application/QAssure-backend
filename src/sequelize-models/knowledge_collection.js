const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeCollection = sequelize.define('KnowledgeCollection', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  document_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  chunk_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'active',
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'knowledge_collections',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
KnowledgeCollection.associate = function(models) {
  if (KnowledgeCollection._associationsInitialized) return;
  const { Tenant, User } = models;

  KnowledgeCollection.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KnowledgeCollection.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'SET', onUpdate: 'CASCADE' });
  Tenant.hasMany(KnowledgeCollection, { foreignKey: 'tenant_id', as: 'knowledgecollections', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(KnowledgeCollection, { foreignKey: 'created_by', as: 'knowledgecollections', onDelete: 'SET', onUpdate: 'CASCADE' });
  KnowledgeCollection._associationsInitialized = true;
};


module.exports = KnowledgeCollection;

