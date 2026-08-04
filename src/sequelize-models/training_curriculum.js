const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingCurriculum = sequelize.define('TrainingCurriculum', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  target_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  target_departments: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'active',
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'training_curricula',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
TrainingCurriculum.associate = function(models) {
  if (TrainingCurriculum._associationsInitialized) return;
  const { Tenant, User } = models;

  TrainingCurriculum.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCurriculum.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(TrainingCurriculum, { foreignKey: 'tenant_id', as: 'trainingcurricula', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(TrainingCurriculum, { foreignKey: 'created_by', as: 'trainingcurricula', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCurriculum._associationsInitialized = true;
};


module.exports = TrainingCurriculum;

