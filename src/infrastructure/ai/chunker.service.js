/**
 * Text Chunker Service - QAssure Platform
 * Splits documents into chunks for embedding
 */

class ChunkerService {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 512;      // tokens (approx 4 chars per token)
    this.chunkOverlap = options.chunkOverlap || 50;  // overlap between chunks
    this.minChunkSize = options.minChunkSize || 100;
    this.separators = options.separators || ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '];
  }

  /**
   * Split text into chunks
   */
  chunk(text, options = {}) {
    const chunkSize = options.chunkSize || this.chunkSize;
    const chunkOverlap = options.chunkOverlap || this.chunkOverlap;
    const charLimit = chunkSize * 4; // Approximate chars per chunk

    if (!text || text.length === 0) {
      return [];
    }

    // If text is smaller than chunk size, return as single chunk
    if (text.length <= charLimit) {
      return [{
        content: text,
        index: 0,
        start: 0,
        end: text.length,
        charCount: text.length,
        tokenEstimate: Math.ceil(text.length / 4)
      }];
    }

    const chunks = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = start + charLimit;

      // Don't exceed text length
      if (end >= text.length) {
        end = text.length;
      } else {
        // Find best split point
        end = this.findSplitPoint(text, start, end);
      }

      const chunkText = text.slice(start, end).trim();
      
      if (chunkText.length >= this.minChunkSize) {
        chunks.push({
          content: chunkText,
          index,
          start,
          end,
          charCount: chunkText.length,
          tokenEstimate: Math.ceil(chunkText.length / 4)
        });
        index++;
      }

      // Move start position with overlap
      const overlapChars = chunkOverlap * 4;
      start = end - overlapChars;
      
      // Ensure we make progress
      if (start <= chunks[chunks.length - 1]?.start) {
        start = end;
      }
    }

    return chunks;
  }

  /**
   * Find best split point near target position
   */
  findSplitPoint(text, start, targetEnd) {
    const searchStart = Math.max(start, targetEnd - 200);
    const searchEnd = Math.min(text.length, targetEnd + 100);
    const searchText = text.slice(searchStart, searchEnd);

    // Try each separator in order of preference
    for (const separator of this.separators) {
      const lastIndex = searchText.lastIndexOf(separator);
      if (lastIndex !== -1) {
        const splitPoint = searchStart + lastIndex + separator.length;
        if (splitPoint > start + this.minChunkSize) {
          return splitPoint;
        }
      }
    }

    // No good split point found, use target
    return targetEnd;
  }

  /**
   * Chunk by paragraphs
   */
  chunkByParagraphs(text, options = {}) {
    const maxChunkSize = (options.chunkSize || this.chunkSize) * 4;
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentChunk = '';
    let index = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 2 <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index: index++,
            charCount: currentChunk.length,
            tokenEstimate: Math.ceil(currentChunk.length / 4)
          });
        }
        
        // If single paragraph is too large, split it
        if (trimmed.length > maxChunkSize) {
          const subChunks = this.chunk(trimmed, options);
          for (const subChunk of subChunks) {
            subChunk.index = index++;
            chunks.push(subChunk);
          }
          currentChunk = '';
        } else {
          currentChunk = trimmed;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index: index++,
        charCount: currentChunk.length,
        tokenEstimate: Math.ceil(currentChunk.length / 4)
      });
    }

    return chunks;
  }

  /**
   * Chunk by sentences
   */
  chunkBySentences(text, options = {}) {
    const maxChunkSize = (options.chunkSize || this.chunkSize) * 4;
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex) || [text];
    const chunks = [];
    let currentChunk = '';
    let index = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index: index++,
            charCount: currentChunk.length,
            tokenEstimate: Math.ceil(currentChunk.length / 4)
          });
        }
        currentChunk = trimmed;
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index: index++,
        charCount: currentChunk.length,
        tokenEstimate: Math.ceil(currentChunk.length / 4)
      });
    }

    return chunks;
  }

  /**
   * Add metadata to chunks
   */
  addMetadata(chunks, metadata = {}) {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...metadata,
        chunkIndex: chunk.index,
        totalChunks: chunks.length
      }
    }));
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}

// Singleton
let instance = null;
const getChunkerService = () => {
  if (!instance) {
    instance = new ChunkerService();
  }
  return instance;
};

module.exports = { ChunkerService, getChunkerService };
