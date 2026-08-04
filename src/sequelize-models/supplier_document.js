const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierDocument = sequelize.define('SupplierDocument', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  document_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  document_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  mime_type: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'active',
  },
  verified_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'supplier_documents',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
SupplierDocument.associate = function(models) {
  if (SupplierDocument._associationsInitialized) return;
  const { Supplier, Tenant, User } = models;

  SupplierDocument.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierDocument.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierDocument.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierDocument.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploadedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(SupplierDocument, { foreignKey: 'supplier_id', as: 'supplierdocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SupplierDocument, { foreignKey: 'tenant_id', as: 'supplierdocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierDocument, { foreignKey: 'verified_by', as: 'supplierdocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierDocument, { foreignKey: 'uploaded_by', as: 'uploadedSupplierdocuments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierDocument._associationsInitialized = true;
};


module.exports = SupplierDocument;

