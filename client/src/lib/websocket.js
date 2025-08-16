class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;

          try {
            const user = window?.authManager?.getCurrentUser?.();
            if (user?.id) this.send("identify", { userId: user.id });
          } catch { }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this._handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.ws = null;
          this._attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  _handleMessage(message) {
    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach((listener) => listener(message.data));
    }
  }

  _attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  send(event, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  joinAuction(auctionId) {
    this.send("join_auction", { auctionId });
  }

  placeBid(auctionId, amount, userId) {
    this.send("place_bid", { auctionId, amount, userId });
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(listener);

    // unsubscribe
    return () => {
      const eventListeners = this.listeners.get(event);
      if (!eventListeners) return;
      const index = eventListeners.indexOf(listener);
      if (index > -1) eventListeners.splice(index, 1);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();
