/**
 * Kafka Consumer Service - QAssure Platform
 * Subscribes to and processes events from Kafka topics
 */
const { Kafka, logLevel } = require('kafkajs');

class KafkaConsumerService {
  constructor() {
    this.kafka = null;
    this.consumer = null;
    this.isConnected = false;
    this.handlers = new Map();
    this.subscribedTopics = new Set();
  }

  /**
   * Initialize Kafka consumer
   */
  async connect(groupId = null) {
    try {
      const brokersEnv = process.env.KAFKA_BROKERS || 'localhost:29092';
      
      // Skip connection if Kafka is explicitly disabled
      if (!brokersEnv || brokersEnv.trim() === '') {
        console.log('[KafkaConsumer] ⚠️ Kafka disabled (KAFKA_BROKERS is empty)');
        this.isConnected = false;
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

      this.consumer = this.kafka.consumer({
        groupId: groupId || process.env.KAFKA_GROUP_ID || 'qassure-consumers',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
        retry: {
          retries: 10
        }
      });

      await this.consumer.connect();
      this.isConnected = true;
      console.log('[KafkaConsumer] ✅ Connected to Kafka brokers:', brokers.join(', '));

      // Handle errors
      this.consumer.on('consumer.crash', async (event) => {
        console.error('[KafkaConsumer] ❌ Consumer crashed:', event.payload.error);
        this.isConnected = false;
        // Attempt reconnection
        setTimeout(() => this.reconnect(), 5000);
      });

      this.consumer.on('consumer.disconnect', () => {
        console.warn('[KafkaConsumer] ⚠️ Disconnected from Kafka');
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('[KafkaConsumer] ❌ Failed to connect:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Reconnect to Kafka
   */
  async reconnect() {
    console.log('[KafkaConsumer] Attempting to reconnect...');
    const connected = await this.connect();
    if (connected && this.subscribedTopics.size > 0) {
      await this.resubscribe();
    }
  }

  /**
   * Resubscribe to previously subscribed topics
   */
  async resubscribe() {
    for (const topic of this.subscribedTopics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    await this.startConsuming();
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect() {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('[KafkaConsumer] Disconnected');
    }
  }

  /**
   * Subscribe to a topic with a handler
   */
  async subscribe(topic, handler) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.isConnected) {
      console.error('[KafkaConsumer] Cannot subscribe - not connected');
      return false;
    }

    try {
      // Register handler
      if (!this.handlers.has(topic)) {
        this.handlers.set(topic, []);
      }
      this.handlers.get(topic).push(handler);

      // Subscribe to topic
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.subscribedTopics.add(topic);
      
      console.log(`[KafkaConsumer] Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`[KafkaConsumer] Failed to subscribe to ${topic}:`, error.message);
      return false;
    }
  }

  /**
   * Subscribe to multiple topics
   */
  async subscribeToMany(topicHandlers) {
    for (const { topic, handler } of topicHandlers) {
      await this.subscribe(topic, handler);
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming() {
    if (!this.isConnected) {
      console.error('[KafkaConsumer] Cannot start consuming - not connected');
      return false;
    }

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          const handlers = this.handlers.get(topic) || [];
          
          if (handlers.length === 0) {
            console.warn(`[KafkaConsumer] No handlers for topic: ${topic}`);
            return;
          }

          try {
            // Parse message
            const event = {
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
              key: message.key?.toString(),
              value: JSON.parse(message.value.toString()),
              headers: this._parseHeaders(message.headers)
            };

            console.log(`[KafkaConsumer] Received from ${topic}:`, event.value.type || 'event');

            // Call all handlers
            for (const handler of handlers) {
              try {
                await handler(event);
              } catch (handlerError) {
                console.error(`[KafkaConsumer] Handler error for ${topic}:`, handlerError.message);
              }
            }

            // Heartbeat to keep consumer alive
            await heartbeat();
          } catch (parseError) {
            console.error(`[KafkaConsumer] Failed to parse message from ${topic}:`, parseError.message);
          }
        }
      });

      console.log('[KafkaConsumer] Started consuming messages');
      return true;
    } catch (error) {
      console.error('[KafkaConsumer] Failed to start consuming:', error.message);
      return false;
    }
  }

  /**
   * Parse message headers
   */
  _parseHeaders(headers) {
    const parsed = {};
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        parsed[key] = value?.toString();
      }
    }
    return parsed;
  }

  /**
   * Pause consumption for a topic
   */
  async pause(topic) {
    if (this.consumer) {
      const partitions = await this._getPartitionsForTopic(topic);
      await this.consumer.pause(partitions.map(p => ({ topic, partition: p })));
      console.log(`[KafkaConsumer] Paused consumption for: ${topic}`);
    }
  }

  /**
   * Resume consumption for a topic
   */
  async resume(topic) {
    if (this.consumer) {
      const partitions = await this._getPartitionsForTopic(topic);
      await this.consumer.resume(partitions.map(p => ({ topic, partition: p })));
      console.log(`[KafkaConsumer] Resumed consumption for: ${topic}`);
    }
  }

  /**
   * Get partitions for a topic
   */
  async _getPartitionsForTopic(topic) {
    const admin = this.kafka.admin();
    await admin.connect();
    const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
    await admin.disconnect();
    return metadata.topics[0]?.partitions.map(p => p.partitionId) || [0];
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      connected: this.isConnected,
      subscribedTopics: Array.from(this.subscribedTopics),
      status: this.isConnected ? 'healthy' : 'disconnected'
    };
  }
}

// Singleton
let instance = null;
const getKafkaConsumer = () => {
  if (!instance) {
    instance = new KafkaConsumerService();
  }
  return instance;
};

module.exports = { KafkaConsumerService, getKafkaConsumer };
