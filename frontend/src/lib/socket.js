// WebSocket connection for real-time updates
// Compatible with both Socket.io (Node.js backend) and native WebSocket (Go backend)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const WS_URL = API_BASE.replace('http', 'ws') + '/ws';

class SocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('Connecting to WebSocket:', WS_URL);
    
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type;
        
        // Emit to all registered listeners for this event type
        if (this.listeners.has(eventType)) {
          this.listeners.get(eventType).forEach(callback => {
            callback(data);
          });
        }

        // Support Socket.io-style event names with runId
        if (data.runId) {
          const runLogEvent = `run_log:${data.runId}`;
          const runFinishedEvent = `run_finished:${data.runId}`;
          
          if (eventType === 'log' && this.listeners.has(runLogEvent)) {
            this.listeners.get(runLogEvent).forEach(callback => {
              callback(data);
            });
          }
          
          if (eventType === 'finished' && this.listeners.has(runFinishedEvent)) {
            this.listeners.get(runFinishedEvent).forEach(callback => {
              callback(data);
            });
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).delete(callback);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Socket.io compatibility methods
  emit(eventName, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: eventName, data }));
    }
  }
}

// Create singleton instance
const socketManager = new SocketManager();

// Auto-connect when imported
if (typeof window !== 'undefined') {
  socketManager.connect();
}

// Export Socket.io-compatible interface
export default socketManager;
