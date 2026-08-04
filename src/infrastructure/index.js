/**
 * Infrastructure Layer - QAssure Platform
 * Exports all infrastructure services
 */
const jwtService = require('./auth/jwt.service');
const permissionService = require('./auth/permission.service');
const redisService = require('./cache/redis.service');
const emailService = require('./email/email.service');

module.exports = {
  jwtService,
  permissionService,
  redisService,
  emailService
};

// Elasticsearch
const { getElasticsearchService } = require('./search/elasticsearch.service');
module.exports.getElasticsearchService = getElasticsearchService;
