const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CurriculumCourse = sequelize.define('CurriculumCourse', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  curriculum_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  tableName: 'curriculum_courses',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
CurriculumCourse.associate = function(models) {
  if (CurriculumCourse._associationsInitialized) return;
  const { TrainingCurriculum, TrainingCourse } = models;

  CurriculumCourse.belongsTo(TrainingCurriculum, { foreignKey: 'curriculum_id', as: 'curriculum', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CurriculumCourse.belongsTo(TrainingCourse, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCurriculum.hasMany(CurriculumCourse, { foreignKey: 'curriculum_id', as: 'curriculumcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TrainingCourse.hasMany(CurriculumCourse, { foreignKey: 'course_id', as: 'curriculumcourses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CurriculumCourse._associationsInitialized = true;
};


module.exports = CurriculumCourse;

