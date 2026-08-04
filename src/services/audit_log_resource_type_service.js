const AuditLogResourceType = require('../sequelize-models/audit_log_resource_type');
const { getModuleLaunchService } = require('./module_launch.service');
const { getPermissionService } = require('../infrastructure/auth/permission.service');
const { Op } = require('sequelize');

class AuditLogResourceTypeService {
  async getAll(options = {}) {
    const { where = {}, skip = 0, take = 50, orderBy = [['created_at', 'DESC']] } = options;
    
    const { count, rows } = await AuditLogResourceType.findAndCountAll({
      where,
      include: [{ model: AuditLogResourceType.sequelize.models.Module, as: 'module', attributes: ['id', 'name'] }],
      offset: skip,
      limit: take,
      order: orderBy,
      distinct: true
    });

    return {
      total: count,
      data: rows,
      hasMore: (skip + take) < count
    };
  }

  async getDropdownOptions(tenantId, user, moduleContext = null) {
    // 1. Resolve module specific context (Mode 1: req.module, Mode 2: req.user.moduleId)
    const activeModuleId = user?.moduleId || moduleContext?.id;

    // 2. Resolve isSuperAdmin if not already set (middleware might not have set it)
    let isSuperAdmin = user?.isSuperAdmin;
    if (isSuperAdmin === undefined && user?.id && !user?.isApiKey) {
      const permissionService = getPermissionService();
      isSuperAdmin = await permissionService.isSuperAdmin(user.id);
    }

    // 3. Collect resource types based on context
    let platformTypes = [];
    let moduleTypes = [];

    if (activeModuleId) {
      // STRICT MODULE MODE: Request came via X-API-KEY (Mode 1 or 2)
      // Only return resource types owned by this specific module
      moduleTypes = await AuditLogResourceType.findAll({
        where: { 
          type: 'MODULE',
          module_id: activeModuleId 
        },
        attributes: ['name']
      });
      // In strict module mode, we generally don't show platform types unless requested
      // The user requested "only modules related data"
    } else {
      // REGULAR/SUPERADMIN MODE: Request came via JWT only (UI)
      
      // Get core platform resource types
      platformTypes = await AuditLogResourceType.findAll({
        where: { type: 'PLATFORM' },
        attributes: ['name']
      });

      if (isSuperAdmin) {
        // Super Admin sees ALL module-specific types
        moduleTypes = await AuditLogResourceType.findAll({
          where: { type: 'MODULE' },
          attributes: ['name']
        });
      } else if (tenantId && user) {
        // Regular users only see types for modules they have access to
        const moduleLaunchService = getModuleLaunchService();
        const result = await moduleLaunchService.getAccessibleModules(user, tenantId);
        
        if (result.success && result.data.length > 0) {
          const moduleIds = result.data.map(m => m.id);
          moduleTypes = await AuditLogResourceType.findAll({
            where: {
              type: 'MODULE',
              module_id: { [Op.in]: moduleIds }
            },
            attributes: ['name']
          });
        }
      }
    }

    console.log(`[AuditLogResourceTypeService] Dropdown request: activeModuleId=${activeModuleId}, PLATFORM=${platformTypes.length}, MODULE=${moduleTypes.length}`);

    const allTypes = [...platformTypes, ...moduleTypes];
    // Filter out duplicates and format for frontend
    const uniqueNames = [...new Set(allTypes.map(t => t.name))].sort((a, b) => a.localeCompare(b));
    return uniqueNames.map(name => ({ value: name, label: name }));
  }

  async create(data) {
    return await AuditLogResourceType.create(data);
  }

  async update(id, data) {
    const rt = await AuditLogResourceType.findByPk(id);
    if (!rt) throw new Error('Resource type not found');
    return await rt.update(data);
  }

  async delete(id) {
    const rt = await AuditLogResourceType.findByPk(id);
    if (!rt) throw new Error('Resource type not found');

    // BE-10: Prevent orphaning existing audit log records.
    // The resource_type column in audit_logs is VARCHAR with no FK constraint,
    // so a DB-level cascade won't protect historical data. We enforce referential
    // integrity in application code before allowing deletion.
    const Auditlog = require('../sequelize-models/audit_log');
    const referenceCount = await Auditlog.count({ where: { resource_type: rt.name } });

    if (referenceCount > 0) {
      const err = new Error(
        `Cannot delete: ${referenceCount.toLocaleString()} audit log${referenceCount === 1 ? '' : 's'} reference this resource type ("${rt.name}"). ` +
        `Consider using a soft-delete or renaming instead of permanent deletion.`
      );
      err.statusCode = 409;
      err.code = 'RESOURCE_IN_USE';
      throw err;
    }

    await rt.destroy();
    return true;
  }
}

module.exports = new AuditLogResourceTypeService();
