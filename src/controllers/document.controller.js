/**
 * Document Controller
 * Handles document management API endpoints
 */

const { getDocumentService } = require('../services/document.service');

class DocumentController {

  /**
   * POST /api/v1/documents
   */
  async create(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const sourceModule = req.body.source_module || req.user?.moduleCode || req.module?.code;
      const sourceModuleId = req.body.source_module_id || req.user?.moduleId || req.module?.id;

      if (!sourceModule || !sourceModuleId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Originating module is required' }
        });
      }

      const document = await service.create(tenantId, {
        ...req.body,
        source_module: sourceModule,
        source_module_id: sourceModuleId
      }, createdBy);

      res.status(201).json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Create error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/documents
   */
  async list(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { status, category_id, document_type, owner_id, search, source_module_id, limit, offset } = req.query;

      const result = await service.list(tenantId, {
        status,
        category_id,
        document_type,
        owner_id,
        search,
        source_module_id,
        source_record_id: req.query.source_record_id,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: result.documents,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      console.error('[Document] List error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/documents/:id
   */
  async getById(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const document = await service.getById(id, tenantId);

      if (!document) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' }
        });
      }

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Get error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/documents/:id
   */
  async update(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;
      
      // Module identification fallback if provided in body, from API key, or from module context
      const sourceModule = req.body.source_module || req.user?.moduleCode || req.module?.code;
      const sourceModuleId = req.body.source_module_id || req.user?.moduleId || req.module?.id;

      // Update data with fallback module identification
      const updateData = { ...req.body };
      if (sourceModule) updateData.source_module = sourceModule;
      if (sourceModuleId) updateData.source_module_id = sourceModuleId;

      if (!updateData.source_module || !updateData.source_module_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: "Originating module is required" }
        });
      }

      const document = await service.update(id, tenantId, updateData, updatedBy);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Update error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/documents/:id/versions
   */
  async getVersions(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const versions = await service.getVersions(id, tenantId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('[Document] Get versions error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/versions
   */
  async createVersion(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      // Module identification fallback
      const sourceModule = req.body.source_module || req.user?.moduleCode || req.module?.code;
      const sourceModuleId = req.body.source_module_id || req.user?.moduleId || req.module?.id;

      const versionData = { ...req.body };
      if (sourceModule) versionData.source_module = sourceModule;
      if (sourceModuleId) versionData.source_module_id = sourceModuleId;

      const version = await service.createVersion(id, tenantId, versionData, createdBy);

      res.status(201).json({
        success: true,
        data: version
      });
    } catch (error) {
      console.error('[Document] Create version error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'VERSION_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/submit
   */
  async submitForReview(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const submittedBy = req.user.id;
      const { id } = req.params;
      const { workflow_definition_id } = req.body;

      const document = await service.submitForReview(id, tenantId, submittedBy, workflow_definition_id);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Submit error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'SUBMIT_ERROR', message: error.message }
      });
    }
  }

 

  /**
   * POST /api/v1/documents/:id/approve
   */
  async approve(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const approvedBy = req.user.id;
      const { id } = req.params;
      const { comments } = req.body;

      const document = await service.approve(id, tenantId, approvedBy, comments);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Approve error:', error.message);
      
      if (error.message === 'The workflow is not in completed status') {
        return res.status(400).json({
          success: false,
          error: { code: 'WORKFLOW_NOT_COMPLETED', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'APPROVE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/reject
   */
  async reject(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const rejectedBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'reason is required when rejecting a document' }
        });
      }

      const document = await service.reject(id, tenantId, rejectedBy, reason);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Reject error:', error.message);

      if (error.message === 'The workflow is not in completed status') {
        return res.status(400).json({
          success: false,
          error: { code: 'WORKFLOW_NOT_COMPLETED', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'REJECT_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/make-effective
   */
  async makeEffective(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const approvedBy = req.user.id;
      const { id } = req.params;
      const { effective_date, signature_id } = req.body;

      if (!effective_date) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'effective_date is required' }
        });
      }

      const document = await service.makeEffective(id, tenantId, effective_date, approvedBy, signature_id);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Make effective error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'MAKE_EFFECTIVE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/obsolete
   */
  async makeObsolete(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const obsoletedBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'reason is required when making a document obsolete' }
        });
      }

      const document = await service.makeObsolete(id, tenantId, obsoletedBy, reason);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error('[Document] Make obsolete error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'OBSOLETE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/checkout
   */
  async checkout(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const result = await service.checkout(id, tenantId, userId, reason);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Document] Checkout error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CHECKOUT_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/:id/checkin
   */
  async checkin(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await service.checkin(id, tenantId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Document] Checkin error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CHECKIN_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/documents/categories
   */
  async getCategories(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;

      const categories = await service.getCategories(tenantId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('[Document] Get categories error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/documents/categories
   */
  async createCategory(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const category = await service.createCategory(tenantId, req.body, createdBy);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('[Document] Create category error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/documents/categories/:id
   */
  async updateCategory(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const category = await service.updateCategory(id, tenantId, req.body);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('[Document] Update category error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * DELETE /api/v1/documents/categories/:id
   */
  async deleteCategory(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      await service.deleteCategory(id, tenantId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('[Document] Delete category error:', error.message);
      const statusCode = error.code === 'CATEGORY_IN_USE' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: { 
          code: error.code || 'DELETE_ERROR', 
          message: error.message 
        }
      });
    }
  }

  /**
   * GET /api/v1/documents/due-for-review
   */
  async getDueForReview(req, res) {
    try {
      const service = getDocumentService();
      const tenantId = req.user.tenantId;
      const { days_ahead } = req.query;

      const documents = await service.getDueForReview(tenantId, parseInt(days_ahead) || 30);

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      console.error('[Document] Due for review error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/documents/types
   */
  async getDocumentTypes(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'SOP', name: 'Standard Operating Procedure' },
        { code: 'WI', name: 'Work Instruction' },
        { code: 'POL', name: 'Policy' },
        { code: 'FRM', name: 'Form' },
        { code: 'SPEC', name: 'Specification' },
        { code: 'QM', name: 'Quality Manual' },
        { code: 'PROC', name: 'Procedure' },
        { code: 'GUIDE', name: 'Guideline' },
        { code: 'REF', name: 'Reference Document' }
      ]
    });
  }

  /**
   * GET /api/v1/documents/statuses
   */
  async getStatuses(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'draft', name: 'Draft', description: 'Document is being created or edited' },
        { code: 'in_review', name: 'In Review', description: 'Document is under review' },
        { code: 'approved', name: 'Approved', description: 'Document has been approved' },
        { code: 'effective', name: 'Effective', description: 'Document is currently in effect' },
        { code: 'obsolete', name: 'Obsolete', description: 'Document has been superseded' },
        { code: 'archived', name: 'Archived', description: 'Document is archived for historical purposes' }
      ]
    });
  }

  // ===========================================================================
  // SECTION HANDLERS
  // ===========================================================================

  /**
   * GET /api/v1/documents/:id/sections
   */
  async getSections(req, res) {
    try {
      const service = getDocumentService();
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const sections = await service.getSections(id, tenantId);
      res.json({ success: true, data: sections });
    } catch (error) {
      console.error('[Document] getSections error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  /**
   * PATCH /api/v1/documents/:id/sections/:sectionId
   */
  async updateSection(req, res) {
    try {
      const service = getDocumentService();
      const { id, sectionId } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const section = await service.updateSection(id, sectionId, tenantId, req.body, userId);
      res.json({ success: true, data: section });
    } catch (error) {
      console.error('[Document] updateSection error:', error.message);
      const status = error.status === 403 ? 403 : 500;
      res.status(status).json({ success: false, error: { code: status === 403 ? 'FORBIDDEN' : 'UPDATE_ERROR', message: error.message } });
    }
  }

  /**
   * POST /api/v1/documents/:id/sections/:sectionId/review
   */
  async markSectionStatus(req, res) {
    try {
      const service = getDocumentService();
      const { id, sectionId } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status is required (reviewed | rework | pending)' } });
      }
      const section = await service.markSectionStatus(id, sectionId, tenantId, status, userId);
      res.json({ success: true, data: section });
    } catch (error) {
      console.error('[Document] markSectionStatus error:', error.message);
      const httpStatus = error.status === 403 ? 403 : 400;
      res.status(httpStatus).json({ success: false, error: { code: 'SECTION_REVIEW_ERROR', message: error.message } });
    }
  }

  // ===========================================================================
  // COMMENT HANDLERS
  // ===========================================================================

  /**
   * GET /api/v1/documents/:id/comments
   */
  async listComments(req, res) {
    try {
      const service = getDocumentService();
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const { section_id } = req.query;
      const comments = await service.listComments(id, tenantId, section_id || null);
      res.json({ success: true, data: comments });
    } catch (error) {
      console.error('[Document] listComments error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  /**
   * POST /api/v1/documents/:id/comments
   */
  async addComment(req, res) {
    try {
      const service = getDocumentService();
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const authorId = req.user.id;
      const comment = await service.addComment(id, tenantId, req.body, authorId);
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      console.error('[Document] addComment error:', error.message);
      res.status(400).json({ success: false, error: { code: 'COMMENT_ERROR', message: error.message } });
    }
  }

  /**
   * PATCH /api/v1/documents/:id/comments/:commentId/resolve
   */
  async resolveComment(req, res) {
    try {
      const service = getDocumentService();
      const { id, commentId } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const comment = await service.resolveComment(id, commentId, tenantId, userId);
      res.json({ success: true, data: comment });
    } catch (error) {
      console.error('[Document] resolveComment error:', error.message);
      res.status(400).json({ success: false, error: { code: 'RESOLVE_ERROR', message: error.message } });
    }
  }
}

module.exports = new DocumentController();
