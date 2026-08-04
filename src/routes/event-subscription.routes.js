// /**
//  * Event Subscription Routes - QAssure Platform
//  * Routes for managing event subscriptions
//  */
// const express = require('express');
// const router = express.Router();
// const eventSubscriptionController = require('../controllers/event-subscription.controller');
// const { authenticate, authorize } = require('../middleware/auth.middleware');

// // All routes require authentication
// router.use(authenticate);

// /**
//  * POST /api/v1/events/subscriptions
//  * Create a new event subscription
//  */
// router.post('/',
//   authorize('events:create'),
//   eventSubscriptionController.create
// );

// /**
//  * GET /api/v1/events/subscriptions
//  * List event subscriptions
//  */
// router.get('/',
//   authorize('events:read'),
//   eventSubscriptionController.list
// );

// /**
//  * GET /api/v1/events/subscriptions/:id
//  * Get subscription by ID
//  */
// router.get('/:id',
//   authorize('events:read'),
//   eventSubscriptionController.getById
// );

// /**
//  * PUT /api/v1/events/subscriptions/:id
//  * Update subscription
//  */
// router.put('/:id',
//   authorize('events:update'),
//   eventSubscriptionController.update
// );

// /**
//  * DELETE /api/v1/events/subscriptions/:id
//  * Delete subscription
//  */
// router.delete('/:id',
//   authorize('events:delete'),
//   eventSubscriptionController.remove
// );

// /**
//  * POST /api/v1/events/subscriptions/:id/pause
//  * Pause subscription
//  */
// router.post('/:id/pause',
//   authorize('events:update'),
//   eventSubscriptionController.pause
// );

// /**
//  * POST /api/v1/events/subscriptions/:id/resume
//  * Resume subscription
//  */
// router.post('/:id/resume',
//   authorize('events:update'),
//   eventSubscriptionController.resume
// );

// module.exports = router;
