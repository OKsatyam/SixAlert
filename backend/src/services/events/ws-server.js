/**
 * ws-server.js — native WebSocket server for SixAlert.
 * Rooms are keyed by matchId. Clients join by connecting with ?matchId= query param.
 * Includes a ping/pong heartbeat to drop dead connections every 30 seconds.
 */
import { WebSocketServer as WsServer } from 'ws';
import { parse } from 'url';
import logger from '../../utils/logger.js';

// how often to ping all connected clients
const HEARTBEAT_INTERVAL_MS = 30_000;
// how long to wait for a pong before dropping the client
const PONG_TIMEOUT_MS = 10_000;

class WebSocketServer {
  constructor(httpServer) {
    this._wss = new WsServer({ server: httpServer });
    // matchId → Set<ws>
    this._rooms = new Map();

    this._wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this._heartbeatTimer = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL_MS);
    logger.info('WebSocket server initialised');
  }

  handleConnection(ws, req) {
    const { query } = parse(req.url, true);
    const matchId = query.matchId;

    if (!matchId) {
      ws.close(1008, 'matchId query param required');
      logger.warn('WS connection rejected: missing matchId');
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => this.leaveMatch(ws, matchId));

    this.joinMatch(ws, matchId);
    logger.info(`WS client joined match=${matchId} total=${this._wss.clients.size}`);
  }

  joinMatch(ws, matchId) {
    if (!this._rooms.has(matchId)) {
      this._rooms.set(matchId, new Set());
    }
    this._rooms.get(matchId).add(ws);
  }

  leaveMatch(ws, matchId) {
    const room = this._rooms.get(matchId);
    if (!room) return;
    room.delete(ws);
    // clean up the map entry so getStats() doesn't report empty rooms
    if (room.size === 0) this._rooms.delete(matchId);
    logger.info(`WS client left match=${matchId}`);
  }

  broadcastToMatch(matchId, payload) {
    const room = this._rooms.get(matchId);
    if (!room || room.size === 0) return;
    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(message);
      }
    }
  }

  getStats() {
    const rooms = {};
    for (const [matchId, clients] of this._rooms) {
      rooms[matchId] = clients.size;
    }
    return { totalConnections: this._wss.clients.size, rooms };
  }

  _heartbeat() {
    for (const [matchId, clients] of this._rooms) {
      for (const ws of clients) {
        if (!ws.isAlive) {
          // no pong received since last ping — drop the connection
          logger.warn(`WS dropping dead client in match=${matchId}`);
          ws.terminate();
          this.leaveMatch(ws, matchId);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }

  close() {
    clearInterval(this._heartbeatTimer);
    this._wss.close();
  }
}

export default WebSocketServer;
