/**
 * Execution Registry Service - QAssure Platform
 * Manages active prompt execution AbortControllers and supports HTTP cancellation
 */
const axios = require('axios');

class ExecutionRegistry {
  constructor() {
    this.activeExecutions = new Map(); // Key: clientRequestId or remoteRequestId -> entry
  }

  register(clientRequestId, abortController, extra = {}) {
    const entry = {
      clientRequestId,
      abortController,
      remoteRequestId: null,
      cancelUrl: extra.cancelUrl || null,
      apiKey: extra.apiKey || null,
    };
    this.activeExecutions.set(clientRequestId, entry);
    console.log(`[ExecutionRegistry] Registered clientRequestId: ${clientRequestId}`);
    return entry;
  }

  associateRemoteId(clientRequestId, remoteRequestId) {
    const entry = this.activeExecutions.get(clientRequestId);
    if (entry) {
      entry.remoteRequestId = remoteRequestId;
      this.activeExecutions.set(remoteRequestId, entry);
      console.log(`[ExecutionRegistry] Associated remoteRequestId: ${remoteRequestId} with clientRequestId: ${clientRequestId}`);
    }
  }

  async cancel(id) {
    const entry = this.activeExecutions.get(id);
    if (!entry) {
      console.log(`[ExecutionRegistry] No active execution found for ID: ${id}`);
      return false;
    }

    console.log(`[ExecutionRegistry] Cancelling execution for ID: ${id}`);

    // 1. Abort the local request signal
    try {
      entry.abortController.abort();
      console.log(`[ExecutionRegistry] Local AbortController aborted successfully`);
    } catch (err) {
      console.error(`[ExecutionRegistry] Failed to abort local controller:`, err.message);
    }

    // 2. If there is a remote cancelUrl and remoteRequestId, call the cancel API
    if (entry.cancelUrl && entry.remoteRequestId) {
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (entry.apiKey) {
          headers['Authorization'] = entry.apiKey.startsWith('Bearer ') 
            ? entry.apiKey 
            : `Bearer ${entry.apiKey}`;
        }
        console.log(`[ExecutionRegistry] Calling remote cancel URL: ${entry.cancelUrl} for remote ID: ${entry.remoteRequestId}`);
        await axios.post(entry.cancelUrl, {
          request_id: entry.remoteRequestId
        }, { headers, timeout: 5000 });
        console.log(`[ExecutionRegistry] Remote cancel URL called successfully`);
      } catch (err) {
        console.error(`[ExecutionRegistry] Remote cancel call failed:`, err.message);
      }
    }

    // 3. Clean up
    this.activeExecutions.delete(entry.clientRequestId);
    if (entry.remoteRequestId) {
      this.activeExecutions.delete(entry.remoteRequestId);
    }
    return true;
  }

  remove(clientRequestId) {
    const entry = this.activeExecutions.get(clientRequestId);
    if (entry) {
      this.activeExecutions.delete(entry.clientRequestId);
      if (entry.remoteRequestId) {
        this.activeExecutions.delete(entry.remoteRequestId);
      }
      console.log(`[ExecutionRegistry] Removed active execution clientRequestId: ${clientRequestId}`);
    }
  }
}

// Singleton instance
const executionRegistry = new ExecutionRegistry();

module.exports = { executionRegistry };
