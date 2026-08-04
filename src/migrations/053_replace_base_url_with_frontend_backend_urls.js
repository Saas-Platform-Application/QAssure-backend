'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns
    await queryInterface.addColumn('modules', 'frontend_base_url', {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: '',
      comment: 'Frontend base URL for the module'
    });

    await queryInterface.addColumn('modules', 'backend_base_url', {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: '',
      comment: 'Backend base URL for the module'
    });

    // Migrate existing base_url data to backend_base_url
    // (assuming existing base_url was the backend URL)
    await queryInterface.sequelize.query(`
      UPDATE modules 
      SET backend_base_url = base_url,
          frontend_base_url = base_url
      WHERE base_url IS NOT NULL
    `);

    // Remove the old base_url column
    await queryInterface.removeColumn('modules', 'base_url');
  },

  async down(queryInterface, Sequelize) {
    // Add back base_url column
    await queryInterface.addColumn('modules', 'base_url', {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: '',
      comment: 'Base URL for the module'
    });

    // Migrate backend_base_url back to base_url
    await queryInterface.sequelize.query(`
      UPDATE modules 
      SET base_url = backend_base_url
      WHERE backend_base_url IS NOT NULL
    `);

    // Remove the new columns
    await queryInterface.removeColumn('modules', 'frontend_base_url');
    await queryInterface.removeColumn('modules', 'backend_base_url');
  }
};
