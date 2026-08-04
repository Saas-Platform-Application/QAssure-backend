/**
 * Event Router - QAssure Platform
 * Routes events from Kafka to subscribers (modules) and webhooks
 */
const { getEventSubscriptionService } = require('../../services/event-subscription.service');
const { getWebhookService } = require('../../services/webhook.service');

class EventRouter {
  constructor() {
    this.subscriptionService = null;
    this.webhookService = null;
    this.handlers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the event router
   */
  async initialize() {
    if (this.initialized) return;

    this.subscriptionService = getEventSubscriptionService();
    this.webhookService = getWebhookService();
    this.initialized = true;

    console.log('[EventRouter] ✅ Initialized');
  }

  /**
   * Register an internal handler for an event pattern
   */
  registerHandler(eventPattern, handler) {
    if (!this.handlers.has(eventPattern)) {
      this.handlers.set(eventPattern, []);
    }
    this.handlers.get(eventPattern).push(handler);
    console.log(`[EventRouter] Registered handler for: ${eventPattern}`);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(eventPattern, handler) {
    if (this.handlers.has(eventPattern)) {
      const handlers = this.handlers.get(eventPattern);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Route an event to all matching subscribers
   */
  async route(event) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { type, tenantId } = event;
    const results = {
      eventId: event.id,
      eventType: type,
      internalHandlers: 0,
      subscriptions: 0,
      webhooks: 0,
      errors: []
    };

    try {
      // 1. Route to internal handlers (registered in code)
      await this._routeToInternalHandlers(event, results);

      // 2. Route to database subscriptions (modules)
      if (tenantId) {
        await this._routeToSubscriptions(event, results);
      }

      // 3. Route to webhooks (external systems)
      if (tenantId) {
        await this._routeToWebhooks(event, results);
      }

    } catch (error) {
      console.error(`[EventRouter] Error routing event ${type}:`, error.message);
      results.errors.push({ phase: 'routing', error: error.message });
    }

    return results;
  }

  /**
   * Route to internal handlers registered in code
   */
  async _routeToInternalHandlers(event, results) {
    const { type } = event;

    // Find matching handlers
    for (const [pattern, handlers] of this.handlers.entries()) {
      if (this._matchesPattern(type, pattern)) {
        for (const handler of handlers) {
          try {
            await handler(event);
            results.internalHandlers++;
          } catch (error) {
            console.error(`[EventRouter] Internal handler error for ${pattern}:`, error.message);
            results.errors.push({
              phase: 'internal',
              pattern,
              error: error.message
            });
          }
        }
      }
    }
  }

  /**
   * Route to database subscriptions
   */
  async _routeToSubscriptions(event, results) {
    const { type, tenantId } = event;

    try {
      const subscriptions = await this.subscriptionService.getSubscribersForEvent(tenantId, type);

      for (const subscription of subscriptions) {
        try {
          // Check filters
          if (!this._matchesFilters(event, subscription.filters)) {
            continue;
          }

          // Deliver based on delivery type
          await this._deliverToSubscription(subscription, event);
          results.subscriptions++;

        } catch (error) {
          console.error(`[EventRouter] Subscription delivery error:`, error.message);
          results.errors.push({
            phase: 'subscription',
            subscriptionId: subscription.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error(`[EventRouter] Error fetching subscriptions:`, error.message);
      results.errors.push({ phase: 'subscriptions', error: error.message });
    }
  }

  /**
   * Deliver event to a subscription based on delivery type
   */
  async _deliverToSubscription(subscription, event) {
    switch (subscription.deliveryType) {
      case 'http':
        // HTTP callback
        await this._deliverHttp(subscription.callbackUrl, event);
        break;

      case 'kafka':
        // Republish to specific Kafka topic
        if (subscription.kafkaTopic) {
          await this._deliverKafka(subscription.kafkaTopic, event);
        }
        break;

      case 'internal':
        // Internal module - look for registered handler
        const moduleHandlers = this.handlers.get(`module:${subscription.moduleCode}`);
        if (moduleHandlers) {
          for (const handler of moduleHandlers) {
            await handler(event);
          }
        }
        break;

      default:
        console.warn(`[EventRouter] Unknown delivery type: ${subscription.deliveryType}`);
    }
  }

  /**
   * Deliver via HTTP callback
   */
  async _deliverHttp(url, event) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': event.type,
          'X-Event-Id': event.id
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[EventRouter] HTTP delivery failed to ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Deliver via Kafka topic
   */
  async _deliverKafka(topic, event) {
    try {
      const { getKafkaProducer } = require('../kafka/producer.service');
      const producer = getKafkaProducer();
      await producer.publish(topic, event);
    } catch (error) {
      console.error(`[EventRouter] Kafka delivery failed to ${topic}:`, error.message);
      throw error;
    }
  }

  /**
   * Route to webhooks
   */
  async _routeToWebhooks(event, results) {
    const { type, tenantId } = event;

    try {
      const webhooks = await this.webhookService.getWebhooksForEvent(tenantId, type);

      for (const webhook of webhooks) {
        try {
          await this.webhookService.queueDelivery(webhook, event);
          results.webhooks++;
        } catch (error) {
          console.error(`[EventRouter] Webhook queue error:`, error.message);
          results.errors.push({
            phase: 'webhook',
            webhookId: webhook.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error(`[EventRouter] Error fetching webhooks:`, error.message);
      results.errors.push({ phase: 'webhooks', error: error.message });
    }
  }

  /**
   * Check if event type matches a pattern
   * Supports wildcards: * matches any single segment, ** matches multiple
   */
  _matchesPattern(eventType, pattern) {
    if (pattern === '*' || pattern === '**') return true;
    if (pattern === eventType) return true;

    const patternParts = pattern.split('.');
    const eventParts = eventType.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '**') return true;
      if (patternParts[i] === '*') continue;
      if (patternParts[i] !== eventParts[i]) return false;
    }

    return patternParts.length === eventParts.length;
  }

  /**
   * Check if event matches subscription filters
   */
  _matchesFilters(event, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(filters)) {
      const eventValue = this._getNestedValue(event, key);
      
      if (Array.isArray(value)) {
        if (!value.includes(eventValue)) return false;
      } else if (eventValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj);
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      registeredPatterns: this.handlers.size,
      patterns: Array.from(this.handlers.keys())
    };
  }
}

// Singleton
let instance = null;
const getEventRouter = () => {
  if (!instance) {
    instance = new EventRouter();
  }
  return instance;
};

module.exports = { EventRouter, getEventRouter };
