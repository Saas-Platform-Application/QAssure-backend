const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentAccessLog = sequelize.define('DocumentAccessLog', {
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
  version_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  accessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'document_access_log',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
DocumentAccessLog.associate = function(models) {
  if (DocumentAccessLog._associationsInitialized) return;
  const { Document, DocumentVersion, Tenant, User } = models;

  DocumentAccessLog.belongsTo(Document, { foreignKey: 'document_id', as: 'document', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentAccessLog.belongsTo(DocumentVersion, { foreignKey: 'version_id', as: 'version', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentAccessLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentAccessLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentAccessLog, { foreignKey: 'document_id', as: 'documentaccesslog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.hasMany(DocumentAccessLog, { foreignKey: 'version_id', as: 'documentaccesslog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentAccessLog, { foreignKey: 'tenant_id', as: 'documentaccesslog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentAccessLog, { foreignKey: 'user_id', as: 'documentaccesslog', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentAccessLog._associationsInitialized = true;
};


module.exports = DocumentAccessLog;

