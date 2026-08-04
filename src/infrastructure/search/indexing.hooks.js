/**
 * Elasticsearch Indexing Hooks
 * Auto-index data when created/updated in PostgreSQL
 */

const { getElasticsearchService } = require('./elasticsearch.service');

class IndexingHooks {
  
  // ============================================================================
  // CAPA INDEXING
  // ============================================================================

  static async indexCapa(capa, tenantId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.indexDocument('capas', capa.id, {
        capa_number: capa.capa_number,
        title: capa.title,
        description: capa.description,
        problem_statement: capa.problem_statement,
        root_cause: capa.root_cause,
        capa_type: capa.capa_type,
        source: capa.source,
        priority: capa.priority,
        status: capa.status,
        department: capa.department,
        owner_id: capa.owner_id,
        identified_date: capa.identified_date,
        target_date: capa.target_date,
        closed_date: capa.closed_date
      }, tenantId);
      console.log('[ES Index] CAPA indexed:', capa.capa_number);
    } catch (error) {
      console.error('[ES Index] CAPA index error:', error.message);
    }
  }

  static async deleteCapa(capaId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.deleteDocument('capas', capaId);
    } catch (error) {
      console.error('[ES Index] CAPA delete error:', error.message);
    }
  }

  // ============================================================================
  // DOCUMENT INDEXING
  // ============================================================================

  static async indexDocument(doc, tenantId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.indexDocument('documents', doc.id, {
        document_number: doc.document_number,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        status: doc.status,
        version: doc.current_version,
        department: doc.department,
        owner_id: doc.owner_id,
        effective_date: doc.effective_date,
        next_review_date: doc.next_review_date
      }, tenantId);
      console.log('[ES Index] Document indexed:', doc.document_number);
    } catch (error) {
      console.error('[ES Index] Document index error:', error.message);
    }
  }

  static async deleteDocument(docId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.deleteDocument('documents', docId);
    } catch (error) {
      console.error('[ES Index] Document delete error:', error.message);
    }
  }

  // ============================================================================
  // SUPPLIER INDEXING
  // ============================================================================

  static async indexSupplier(supplier, tenantId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.indexDocument('suppliers', supplier.id, {
        supplier_code: supplier.supplier_code,
        name: supplier.name,
        legal_name: supplier.legal_name,
        supplier_type: supplier.supplier_type,
        category: supplier.category,
        status: supplier.status,
        risk_level: supplier.risk_level,
        current_score: supplier.current_score,
        score_grade: supplier.score_grade,
        city: supplier.city,
        country: supplier.country,
        products_services: supplier.products_services
      }, tenantId);
      console.log('[ES Index] Supplier indexed:', supplier.supplier_code);
    } catch (error) {
      console.error('[ES Index] Supplier index error:', error.message);
    }
  }

  static async deleteSupplier(supplierId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.deleteDocument('suppliers', supplierId);
    } catch (error) {
      console.error('[ES Index] Supplier delete error:', error.message);
    }
  }

  // ============================================================================
  // TRAINING INDEXING
  // ============================================================================

  static async indexTrainingCourse(course, tenantId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.indexDocument('training', course.id, {
        course_code: course.course_code,
        title: course.title,
        description: course.description,
        category: course.category,
        training_type: course.training_type,
        status: course.status,
        duration_minutes: course.duration_minutes,
        passing_score: course.passing_score
      }, tenantId);
      console.log('[ES Index] Training course indexed:', course.course_code);
    } catch (error) {
      console.error('[ES Index] Training index error:', error.message);
    }
  }

  static async deleteTrainingCourse(courseId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.deleteDocument('training', courseId);
    } catch (error) {
      console.error('[ES Index] Training delete error:', error.message);
    }
  }

  // ============================================================================
  // AUDIT LOG INDEXING
  // ============================================================================

  static async indexAuditLog(logEntry, tenantId) {
    const es = getElasticsearchService();
    if (!es.isConnected) return;

    try {
      await es.logAudit(tenantId, logEntry);
    } catch (error) {
      console.error('[ES Index] Audit log error:', error.message);
    }
  }
}

module.exports = { IndexingHooks };
