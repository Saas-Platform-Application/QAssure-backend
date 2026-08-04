const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovedSupplierList = sequelize.define('ApprovedSupplierList', {
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
  material_category: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  material_codes: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  approval_scope: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  restrictions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'active',
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  signature_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'approved_supplier_list',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
ApprovedSupplierList.associate = function(models) {
  if (ApprovedSupplierList._associationsInitialized) return;
  const { Supplier, Tenant, User } = models;

  ApprovedSupplierList.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ApprovedSupplierList.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ApprovedSupplierList.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(ApprovedSupplierList, { foreignKey: 'supplier_id', as: 'approvedsupplierlist', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ApprovedSupplierList, { foreignKey: 'tenant_id', as: 'approvedsupplierlist', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ApprovedSupplierList, { foreignKey: 'approved_by', as: 'approvedsupplierlist', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ApprovedSupplierList._associationsInitialized = true;
};


module.exports = ApprovedSupplierList;

