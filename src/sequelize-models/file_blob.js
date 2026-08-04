const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileBlob = sequelize.define('FileBlob', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  checksum: { type: DataTypes.STRING(64), allowNull: false },
  module_id: { type: DataTypes.UUID, allowNull: true },      // from req.module.id / api key; null = platform uploads
  supplier_id: { type: DataTypes.UUID, allowNull: true },    // from users.supplier_id of the uploader; null = no supplier
  storage_provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'local' },
  storage_path: { type: DataTypes.STRING(1000), allowNull: false },
  stored_name: { type: DataTypes.STRING(500), allowNull: false },
  mime_type: { type: DataTypes.STRING(255), allowNull: false },
  file_size: { type: DataTypes.BIGINT, allowNull: false },
  reference_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_soft_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  soft_deleted_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'file_blobs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

FileBlob.associate = function (models) {
  if (FileBlob._associationsInitialized) return;
  const { Tenant } = models;
  FileBlob.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(FileBlob, { foreignKey: 'tenant_id', as: 'fileblobs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileBlob._associationsInitialized = true;
};

module.exports = FileBlob;
