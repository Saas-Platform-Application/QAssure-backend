const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeSearchHistory = sequelize.define('KnowledgeSearchHistory', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  query: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  document_ids: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  context: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  search_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'semantic', // 'semantic' or 'context'
  },
}, {
  tableName: 'knowledge_search_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

KnowledgeSearchHistory.associate = function(models) {
  if (KnowledgeSearchHistory._associationsInitialized) return;
  const { Tenant, User, KnowledgeCollection } = models;

  KnowledgeSearchHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  KnowledgeSearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'SET', onUpdate: 'CASCADE' });
  KnowledgeSearchHistory.belongsTo(KnowledgeCollection, { foreignKey: 'collection_id', as: 'collection', onDelete: 'SET', onUpdate: 'CASCADE' });
  
  KnowledgeSearchHistory._associationsInitialized = true;
};

module.exports = KnowledgeSearchHistory;
