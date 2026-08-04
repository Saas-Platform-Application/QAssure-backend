const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserCompetency = sequelize.define('UserCompetency', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  competency_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  current_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  target_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  assessed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  evidence: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  training_record_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'user_competencies',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
UserCompetency.associate = function(models) {
  if (UserCompetency._associationsInitialized) return;
  const { Tenant, User, CompetencyDefinition, TrainingRecord } = models;

  UserCompetency.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserCompetency.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserCompetency.belongsTo(CompetencyDefinition, { foreignKey: 'competency_id', as: 'competency', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserCompetency.belongsTo(User, { foreignKey: 'assessed_by', as: 'assessedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserCompetency.belongsTo(TrainingRecord, { foreignKey: 'training_record_id', as: 'trainingrecord', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(UserCompetency, { foreignKey: 'tenant_id', as: 'usercompetencies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(UserCompetency, { foreignKey: 'user_id', as: 'usercompetencies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(UserCompetency, { foreignKey: 'assessed_by', as: 'assessedUsercompetencies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CompetencyDefinition.hasMany(UserCompetency, { foreignKey: 'competency_id', as: 'usercompetencies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingRecord.hasMany(UserCompetency, { foreignKey: 'training_record_id', as: 'usercompetencies', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserCompetency._associationsInitialized = true;
};


module.exports = UserCompetency;

