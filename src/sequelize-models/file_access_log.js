const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileAccessLog = sequelize.define('FileAccessLog', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'file_access_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
FileAccessLog.associate = function(models) {
  if (FileAccessLog._associationsInitialized) return;
  const { Tenant, FileAttachment, User } = models;

  FileAccessLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAccessLog.belongsTo(FileAttachment, { foreignKey: 'file_id', as: 'file', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAccessLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(FileAccessLog, { foreignKey: 'tenant_id', as: 'fileaccesslogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAttachment.hasMany(FileAccessLog, { foreignKey: 'file_id', as: 'fileaccesslogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FileAccessLog, { foreignKey: 'user_id', as: 'fileaccesslogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FileAccessLog._associationsInitialized = true;
};


module.exports = FileAccessLog;

