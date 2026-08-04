const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StorageQuota = sequelize.define('StorageQuota', {
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
    unique: true,
  },
  max_storage_bytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 10737418240, // 10 GB
  },
  max_file_size_bytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 104857600, // 100 MB
  },
  used_storage_bytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 0,
  },
  file_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  allowed_mime_types: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  blocked_extensions: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: ['.exe', '.bat', '.cmd', '.sh', '.ps1'],
  },
}, {
  tableName: 'storage_quotas',
  underscored: true,
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
StorageQuota.associate = function(models) {
  if (StorageQuota._associationsInitialized) return;
  const { Tenant } = models;

  StorageQuota.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(StorageQuota, { foreignKey: 'tenant_id', as: 'storagequotas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  StorageQuota._associationsInitialized = true;
};


module.exports = StorageQuota;

