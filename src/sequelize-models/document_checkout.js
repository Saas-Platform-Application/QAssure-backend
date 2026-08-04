const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentCheckout = sequelize.define('DocumentCheckout', {
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
    unique: true,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  checked_out_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  checked_out_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'document_checkouts',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
DocumentCheckout.associate = function(models) {
  if (DocumentCheckout._associationsInitialized) return;
  const { Document, Tenant, User } = models;

  DocumentCheckout.belongsTo(Document, { foreignKey: 'document_id', as: 'document', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCheckout.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCheckout.belongsTo(User, { foreignKey: 'checked_out_by', as: 'checkedoutby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Document.hasMany(DocumentCheckout, { foreignKey: 'document_id', as: 'documentcheckouts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(DocumentCheckout, { foreignKey: 'tenant_id', as: 'documentcheckouts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(DocumentCheckout, { foreignKey: 'checked_out_by', as: 'documentcheckouts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  DocumentCheckout._associationsInitialized = true;
};


module.exports = DocumentCheckout;

