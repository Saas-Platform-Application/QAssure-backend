const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentCategory = sequelize.define('DocumentCategory', {
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
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  requires_training: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  retention_years: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 7,
  },
  review_frequency_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 12,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'document_categories',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
DocumentCategory.associate = function(models) {
  if (DocumentCategory._associationsInitialized) return;
  const { Tenant, User  } = models;

  DocumentCategory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCategory.belongsTo(DocumentCategory, { foreignKey: 'parent_id', as: 'parent', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCategory.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentCategory, { foreignKey: 'tenant_id', as: 'documentcategories', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentCategory, { foreignKey: 'created_by', as: 'documentcategories', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCategory._associationsInitialized = true;
};


module.exports = DocumentCategory;

