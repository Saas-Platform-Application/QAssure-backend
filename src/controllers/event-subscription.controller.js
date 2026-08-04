/**
 * Event Subscription Controller - QAssure Platform
 * HTTP handlers for event subscription management
 */
const { getEventSubscriptionService } = require('../services/event-subscription.service');

const subscriptionService = getEventSubscriptionService();

/**
 * Create event subscription
 * POST /api/v1/events/subscriptions
 */
const create = async (req, res) => {
  try {
    const subscription = await subscriptionService.create(
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Event subscription created'
    });
  } catch (error) {
    console.error('[EventSubscriptionController] create error:', error.message);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message }
    });
  }
};

/**
 * List event subscriptions
 * GET /api/v1/events/subscriptions
 */
const list = async (req, res) => {
  try {
    const { moduleCode, eventPattern, status, deliveryType, page, limit } = req.query;

    const result = await subscriptionService.list(req.user?.tenantId, {
      moduleCode,
      eventPattern,
      status,
      deliveryType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[EventSubscriptionController] list error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: error.message }
    });
  }
};

/**
 * Get event subscription by ID
 * GET /api/v1/events/subscriptions/:id
 */
const getById = async (req, res) => {
  try {
    const subscription = await subscriptionService.getById(
      req.params.id,
      req.user?.tenantId
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[EventSubscriptionController] getById error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'GET_FAILED', message: error.message }
    });
  }
};

/**
 * Update event subscription
 * PUT /api/v1/events/subscriptions/:id
 */
const update = async (req, res) => {
  try {
    const subscription = await subscriptionService.update(
      req.params.id,
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription updated'
    });
  } catch (error) {
    console.error('[EventSubscriptionController] update error:', error.message);
    
    if (error.message === 'Subscription not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message }
    });
  }
};

/**
 * Delete event subscription
 * DELETE /api/v1/events/subscriptions/:id
 */
const remove = async (req, res) => {
  try {
    await subscriptionService.delete(req.params.id, req.user?.tenantId);

    res.status(200).json({
      success: true,
      message: 'Subscription deleted'
    });
  } catch (error) {
    console.error('[EventSubscriptionController] delete error:', error.message);
    
    if (error.message === 'Subscription not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message }
    });
  }
};

/**
 * Pause subscription
 * POST /api/v1/events/subscriptions/:id/pause
 */
const pause = async (req, res) => {
  try {
    const subscription = await subscriptionService.pause(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription paused'
    });
  } catch (error) {
    console.error('[EventSubscriptionController] pause error:', error.message);
    res.status(400).json({
      success: false,
      error: { code: 'PAUSE_FAILED', message: error.message }
    });
  }
};

/**
 * Resume subscription
 * POST /api/v1/events/subscriptions/:id/resume
 */
const resume = async (req, res) => {
  try {
    const subscription = await subscriptionService.resume(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription resumed'
    });
  } catch (error) {
    console.error('[EventSubscriptionController] resume error:', error.message);
    res.status(400).json({
      success: false,
      error: { code: 'RESUME_FAILED', message: error.message }
    });
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  pause,
  resume
};
