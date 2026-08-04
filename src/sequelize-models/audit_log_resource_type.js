const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLogResourceType = sequelize.define('AuditLogResourceType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('PLATFORM', 'MODULE'),
    defaultValue: 'PLATFORM',
    allowNull: false
  },
  module_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'modules',
      key: 'id'
    }
  },
  audit_log_tracking: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'audit_log_resource_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

AuditLogResourceType.associate = (models) => {
  AuditLogResourceType.belongsTo(models.Module, {
    foreignKey: 'module_id',
    as: 'module'
  });
};

module.exports = AuditLogResourceType;
