const { getElasticsearchService } = require('./elasticsearch.service');

const initializeElasticsearch = async () => {
  const es = getElasticsearchService();
  try {
    await es.connect();
    return true;
  } catch (error) {
    console.error('[Elasticsearch] Failed to initialize:', error.message);
    return false;
  }
};

module.exports = { initializeElasticsearch, getElasticsearchService };
