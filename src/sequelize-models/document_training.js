const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentTraining = sequelize.define('DocumentTraining', {
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
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  required_for: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  role_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  department_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  due_within_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
  },
  requires_acknowledgment: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  requires_quiz: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  quiz_pass_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 80,
  },
}, {
  tableName: 'document_training',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
DocumentTraining.associate = function(models) {
  if (DocumentTraining._associationsInitialized) return;
  const { Document, DocumentVersion, Tenant, User } = models;

  DocumentTraining.belongsTo(Document, { foreignKey: 'document_id', as: 'document', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTraining.belongsTo(DocumentVersion, { foreignKey: 'version_id', as: 'version', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTraining.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTraining.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentTraining, { foreignKey: 'document_id', as: 'documenttraining', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentVersion.hasMany(DocumentTraining, { foreignKey: 'version_id', as: 'documenttraining', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentTraining, { foreignKey: 'tenant_id', as: 'documenttraining', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentTraining, { foreignKey: 'user_id', as: 'documenttraining', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTraining._associationsInitialized = true;
};


module.exports = DocumentTraining;

