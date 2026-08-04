const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileShare = sequelize.define('FileShare', {
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
  file_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  share_token: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  share_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'link',
  },
  shared_with_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  shared_with_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  permissions: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'view',
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  max_downloads: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  current_downloads: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  last_accessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'file_shares',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
FileShare.associate = function(models) {
  if (FileShare._associationsInitialized) return;
  const { Tenant, FileAttachment, User } = models;

  FileShare.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileShare.belongsTo(FileAttachment, { foreignKey: 'file_id', as: 'file', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileShare.belongsTo(User, { foreignKey: 'shared_with_user_id', as: 'sharedwithuser', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileShare.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(FileShare, { foreignKey: 'tenant_id', as: 'fileshares', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAttachment.hasMany(FileShare, { foreignKey: 'file_id', as: 'fileshares', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FileShare, { foreignKey: 'shared_with_user_id', as: 'fileshares', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FileShare, { foreignKey: 'created_by', as: 'createdFileshares', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileShare._associationsInitialized = true;
};


module.exports = FileShare;

