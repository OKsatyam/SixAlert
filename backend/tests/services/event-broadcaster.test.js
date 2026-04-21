/**
 * Tests for event-broadcaster.js — payload shape, silent empty-room handling.
 * OfferTrigger DB call is mocked; wsServer is a plain mock object.
 */
import { jest } from '@jest/globals';

jest.mock('../../src/models/offer-trigger.js', () => ({
  default: { findById: jest.fn() },
}));
jest.mock('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { broadcastOfferTrigger, broadcastMatchUpdate } from '../../src/services/events/event-broadcaster.js';
import OfferTrigger from '../../src/models/offer-trigger.js';

const mockExpiresAt = new Date('2025-04-20T15:00:00.000Z');

const mockPopulated = {
  _id: 'trigger-id',
  matchId: 'match-db-id',
  expiresAt: mockExpiresAt,
  offerId: {
    _id: 'offer-id',
    title: 'Swiggy 66% off',
    discountType: 'percentage',
    discountValue: 66,
    durationSeconds: 600,
    brandId: {
      name: 'Swiggy',
      logoUrl: 'https://cdn.swiggy.com/logo.png',
    },
  },
};

const makeWsServer = (hasClients = true) => ({
  broadcastToMatch: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    totalConnections: hasClients ? 1 : 0,
    rooms: hasClients ? { 'match-db-id': 1 } : {},
  }),
});

beforeEach(() => {
  jest.clearAllMocks();
  OfferTrigger.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue(mockPopulated),
  });
});

describe('broadcastOfferTrigger', () => {
  it('calls broadcastToMatch with correct OFFER_TRIGGERED payload shape', async () => {
    const wsServer = makeWsServer(true);
    await broadcastOfferTrigger(wsServer, { _id: 'trigger-id' });

    expect(wsServer.broadcastToMatch).toHaveBeenCalledWith(
      'match-db-id',
      expect.objectContaining({
        type: 'OFFER_TRIGGERED',
        matchId: 'match-db-id',
        offer: expect.objectContaining({
          id: 'offer-id',
          title: 'Swiggy 66% off',
          brand: 'Swiggy',
          logoUrl: 'https://cdn.swiggy.com/logo.png',
          discountType: 'percentage',
          discountValue: 66,
          durationSeconds: 600,
          expiresAt: mockExpiresAt.toISOString(),
        }),
      })
    );
  });

  it('does not call broadcastToMatch when room has no clients', async () => {
    const wsServer = makeWsServer(false);
    await broadcastOfferTrigger(wsServer, { _id: 'trigger-id' });
    expect(wsServer.broadcastToMatch).not.toHaveBeenCalled();
  });

  it('does not throw when OfferTrigger is not found in DB', async () => {
    OfferTrigger.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const wsServer = makeWsServer(true);
    await expect(broadcastOfferTrigger(wsServer, { _id: 'bad-id' })).resolves.not.toThrow();
  });
});

describe('broadcastMatchUpdate', () => {
  it('calls broadcastToMatch with correct MATCH_UPDATE payload shape', () => {
    const wsServer = makeWsServer(true);
    const match = { _id: 'match-db-id', currentOver: 12, currentBall: 3, status: 'live' };
    broadcastMatchUpdate(wsServer, match);

    expect(wsServer.broadcastToMatch).toHaveBeenCalledWith(
      'match-db-id',
      {
        type: 'MATCH_UPDATE',
        matchId: 'match-db-id',
        currentOver: 12,
        currentBall: 3,
        status: 'live',
      }
    );
  });

  it('silently skips broadcast when no clients are in the room', () => {
    const wsServer = makeWsServer(false);
    const match = { _id: 'match-db-id', currentOver: 0, currentBall: 0, status: 'live' };
    expect(() => broadcastMatchUpdate(wsServer, match)).not.toThrow();
    expect(wsServer.broadcastToMatch).not.toHaveBeenCalled();
  });
});
