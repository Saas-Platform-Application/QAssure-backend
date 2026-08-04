/**
 * Kafka Module Exports - QAssure Platform
 */
const { KafkaProducerService, getKafkaProducer } = require('./producer.service');
const { KafkaConsumerService, getKafkaConsumer } = require('./consumer.service');
const { EventService, getEventService, TOPICS, EVENT_TYPES } = require('./event.service');
const { 
  AuthEvents, 
  UserEvents, 
  TenantEvents, 
  ModuleEvents, 
  ApiKeyEvents,
  SystemEvents,
  createBaseEvent
} = require('./events');

module.exports = {
  // Services
  KafkaProducerService,
  KafkaConsumerService,
  EventService,
  
  // Singletons
  getKafkaProducer,
  getKafkaConsumer,
  getEventService,
  
  // Constants
  TOPICS,
  EVENT_TYPES,
  
  // Event Builders
  AuthEvents,
  UserEvents,
  TenantEvents,
  ModuleEvents,
  ApiKeyEvents,
  SystemEvents,
  createBaseEvent
};
