const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileAttachment = sequelize.define('FileAttachment', {
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
  original_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  stored_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  checksum: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  storage_provider: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'local',
  },
  storage_bucket: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  storage_region: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  category_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  source_module: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'platform',
  },
  source_module_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  is_current_version: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  previous_version_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  blob_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  access_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'private',
  },
  download_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  has_thumbnail: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  thumbnail_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  scan_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
  },
  scanned_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'file_attachments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

// Define associations
FileAttachment.associate = function(models) {
  if (FileAttachment._associationsInitialized) return;
  const { Tenant, User  } = models;

  FileAttachment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAttachment.belongsTo(FileAttachment, { foreignKey: 'previous_version_id', as: 'previousversion', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploadedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(FileAttachment, { foreignKey: 'tenant_id', as: 'fileattachments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FileAttachment, { foreignKey: 'uploaded_by', as: 'fileattachments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAttachment._associationsInitialized = true;
};


module.exports = FileAttachment;

