/**
 * AI Infrastructure Exports - QAssure Platform
 */
const { BaseAIProvider } = require('./base-provider');
const { OpenAIProvider, AIProviderError } = require('./openai.provider');
const { AnthropicProvider } = require('./anthropic.provider');
const { GeminiProvider } = require('./gemini.provider');
const { AIGatewayService, getAIGateway } = require('./gateway.service');
const { EmbeddingService, getEmbeddingService } = require('./embedding.service');
const { DocumentProcessor, getDocumentProcessor } = require('./document.processor');
const { ChunkerService, getChunkerService } = require('./chunker.service');
const { VectorStoreService, getVectorStoreService } = require('./vector-store.service');

module.exports = {
  // Base
  BaseAIProvider,
  AIProviderError,
  
  // Providers
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,

  
  // Gateway
  AIGatewayService,
  getAIGateway,
  
  // RAG Components
  EmbeddingService,
  getEmbeddingService,
  DocumentProcessor,
  getDocumentProcessor,
  ChunkerService,
  getChunkerService,
  VectorStoreService,
  getVectorStoreService
};
