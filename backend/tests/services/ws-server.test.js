/**
 * Tests for ws-server.js — room management, broadcast, heartbeat, and connection handling.
 * Uses EventEmitter to mock ws connections — no real HTTP server needed.
 */
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set(),
    close: jest.fn(),
  })),
}));
jest.mock('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import WebSocketServer from '../../src/services/events/ws-server.js';

const makeWs = (readyState = 1) => {
  const ws = new EventEmitter();
  ws.readyState = readyState;
  ws.isAlive = true;
  ws.send = jest.fn();
  ws.ping = jest.fn();
  ws.terminate = jest.fn();
  ws.close = jest.fn();
  return ws;
};

const makeReq = (matchId) => ({
  url: matchId ? `/?matchId=${matchId}` : '/',
});

let wsServer;

beforeEach(() => {
  wsServer = new WebSocketServer({});
  wsServer._wss.clients = new Set();
});

afterEach(() => {
  clearInterval(wsServer._heartbeatTimer);
});

describe('joinMatch / leaveMatch', () => {
  it('adds client to the correct room', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-1');
    expect(wsServer._rooms.get('match-1').has(ws)).toBe(true);
  });

  it('creates a new room if one does not exist', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-new');
    expect(wsServer._rooms.has('match-new')).toBe(true);
  });

  it('removes client from room on leaveMatch', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-1');
    wsServer.leaveMatch(ws, 'match-1');
    expect(wsServer._rooms.has('match-1')).toBe(false);
  });

  it('deletes empty room after last client leaves', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-1');
    wsServer.leaveMatch(ws, 'match-1');
    expect(wsServer._rooms.has('match-1')).toBe(false);
  });
});

describe('broadcastToMatch', () => {
  it('sends JSON payload to all clients in the room', () => {
    const ws1 = makeWs();
    const ws2 = makeWs();
    wsServer.joinMatch(ws1, 'match-1');
    wsServer.joinMatch(ws2, 'match-1');
    wsServer.broadcastToMatch('match-1', { type: 'OFFER_TRIGGERED' });
    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ type: 'OFFER_TRIGGERED' }));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'OFFER_TRIGGERED' }));
  });

  it('does not send to clients in a different room', () => {
    const ws1 = makeWs();
    const ws2 = makeWs();
    wsServer.joinMatch(ws1, 'match-1');
    wsServer.joinMatch(ws2, 'match-2');
    wsServer.broadcastToMatch('match-1', { type: 'OFFER_TRIGGERED' });
    expect(ws2.send).not.toHaveBeenCalled();
  });

  it('does nothing silently when room has no clients', () => {
    expect(() => wsServer.broadcastToMatch('match-empty', { type: 'TEST' })).not.toThrow();
  });
});

describe('handleConnection', () => {
  it('closes connection with 1008 when matchId is missing', () => {
    const ws = makeWs();
    wsServer.handleConnection(ws, makeReq(null));
    expect(ws.close).toHaveBeenCalledWith(1008, expect.any(String));
  });

  it('adds client to room when matchId is present', () => {
    const ws = makeWs();
    wsServer.handleConnection(ws, makeReq('match-99'));
    expect(wsServer._rooms.get('match-99').has(ws)).toBe(true);
  });
});

describe('heartbeat', () => {
  it('terminates client that did not respond with pong', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-1');
    ws.isAlive = false; // simulate no pong received
    wsServer._heartbeat();
    expect(ws.terminate).toHaveBeenCalled();
  });

  it('sets isAlive to false and pings live clients', () => {
    const ws = makeWs();
    wsServer.joinMatch(ws, 'match-1');
    ws.isAlive = true;
    wsServer._heartbeat();
    expect(ws.ping).toHaveBeenCalled();
    expect(ws.isAlive).toBe(false);
  });
});
