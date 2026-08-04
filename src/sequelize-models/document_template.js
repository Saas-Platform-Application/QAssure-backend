const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentTemplate = sequelize.define('DocumentTemplate', {
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
  document_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  template_content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  template_html: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'document_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
DocumentTemplate.associate = function(models) {
  if (DocumentTemplate._associationsInitialized) return;
  const { Tenant, DocumentCategory, User } = models;

  DocumentTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTemplate.belongsTo(DocumentCategory, { foreignKey: 'category_id', as: 'category', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTemplate.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentTemplate, { foreignKey: 'tenant_id', as: 'documenttemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCategory.hasMany(DocumentTemplate, { foreignKey: 'category_id', as: 'documenttemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentTemplate, { foreignKey: 'created_by', as: 'documenttemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentTemplate._associationsInitialized = true;
};


module.exports = DocumentTemplate;

