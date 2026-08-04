/**
 * Kafka Producer Service - QAssure Platform
 * Publishes events to Kafka topics
 */
const { Kafka, Partitioners, logLevel } = require('kafkajs');

class KafkaProducerService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Initialize Kafka connection
   */
  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  async _connect() {
    try {
      const brokersEnv = process.env.KAFKA_BROKERS || 'localhost:29092';
      
      // Skip connection if Kafka is explicitly disabled
      if (!brokersEnv || brokersEnv.trim() === '') {
        console.log('[KafkaProducer] ⚠️ Kafka disabled (KAFKA_BROKERS is empty)');
        this.isConnected = false;
        this.connectionPromise = null;
        return false;
      }
      
      const brokers = brokersEnv.split(',');
      
      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'qassure-api',
        brokers,
        logLevel: logLevel.WARN,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });

      await this.producer.connect();
      this.isConnected = true;
      console.log('[KafkaProducer] ✅ Connected to Kafka brokers:', brokers.join(', '));

      // Handle disconnection
      this.producer.on('producer.disconnect', () => {
        console.warn('[KafkaProducer] ⚠️ Disconnected from Kafka');
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('[KafkaProducer] ❌ Failed to connect:', error.message);
      this.isConnected = false;
      this.connectionPromise = null;
      return false;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect() {
    if (this.producer) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('[KafkaProducer] Disconnected');
    }
  }

  /**
   * Publish a single event
   */
  async publish(topic, event) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.isConnected) {
      console.warn('[KafkaProducer] Not connected, event not published:', topic);
      return false;
    }

    try {
      const message = {
        key: event.key || event.id || null,
        value: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date().toISOString(),
          version: '1.0'
        }),
        headers: {
          'content-type': 'application/json',
          'event-type': event.type || topic,
          'correlation-id': event.correlationId || '',
          'tenant-id': event.tenantId || ''
        }
      };

      await this.producer.send({
        topic,
        messages: [message]
      });

      console.log(`[KafkaProducer] Published to ${topic}:`, event.type || 'event');
      return true;
    } catch (error) {
      console.error(`[KafkaProducer] Failed to publish to ${topic}:`, error.message);
      return false;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(topic, events) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.isConnected) {
      console.warn('[KafkaProducer] Not connected, batch not published');
      return false;
    }

    try {
      const messages = events.map(event => ({
        key: event.key || event.id || null,
        value: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date().toISOString(),
          version: '1.0'
        }),
        headers: {
          'content-type': 'application/json',
          'event-type': event.type || topic,
          'correlation-id': event.correlationId || '',
          'tenant-id': event.tenantId || ''
        }
      }));

      await this.producer.send({
        topic,
        messages
      });

      console.log(`[KafkaProducer] Published batch of ${events.length} to ${topic}`);
      return true;
    } catch (error) {
      console.error(`[KafkaProducer] Failed to publish batch to ${topic}:`, error.message);
      return false;
    }
  }

  /**
   * Publish to multiple topics
   */
  async publishToMultipleTopics(topicMessages) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.isConnected) {
      return false;
    }

    try {
      await this.producer.sendBatch({
        topicMessages: topicMessages.map(({ topic, events }) => ({
          topic,
          messages: events.map(event => ({
            key: event.key || event.id || null,
            value: JSON.stringify({
              ...event,
              timestamp: event.timestamp || new Date().toISOString(),
              version: '1.0'
            })
          }))
        }))
      });

      return true;
    } catch (error) {
      console.error('[KafkaProducer] Failed to publish to multiple topics:', error.message);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      connected: this.isConnected,
      status: this.isConnected ? 'healthy' : 'disconnected'
    };
  }
}

// Singleton
let instance = null;
const getKafkaProducer = () => {
  if (!instance) {
    instance = new KafkaProducerService();
  }
  return instance;
};

module.exports = { KafkaProducerService, getKafkaProducer };
