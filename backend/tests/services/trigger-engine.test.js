/**
 * Tests for trigger-engine.js — validation, offer matching, trigger creation,
 * and no-op cases (dot ball, no match found, no active offers).
 * All Mongoose models are mocked — no DB connection required.
 */
import { jest } from '@jest/globals';

jest.mock('../../src/models/match.js', () => ({ default: { findOne: jest.fn() } }));
jest.mock('../../src/models/offer.js', () => ({ default: { find: jest.fn() } }));
jest.mock('../../src/models/offer-trigger.js', () => ({ default: { insertMany: jest.fn() } }));
jest.mock('../../src/models/ball-event.js', () => ({ default: { create: jest.fn() } }));
jest.mock('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { processBallEvent } from '../../src/services/offers/trigger-engine.js';
import Match from '../../src/models/match.js';
import Offer from '../../src/models/offer.js';
import OfferTrigger from '../../src/models/offer-trigger.js';
import BallEventModel from '../../src/models/ball-event.js';

const mockMatch = { _id: 'match-db-id', sport: 'sport-db-id' };
const mockOffer = { _id: 'offer-db-id', durationSeconds: 600 };
const mockTrigger = { _id: 'trigger-db-id' };

const baseBallEvent = () => ({
  match_id: 'cricapi-001',
  over: 3, ball: 2, runs: 6,
  is_six: true, is_four: false, is_wicket: false,
  batsman: 'Kohli', bowler: 'Bumrah',
  source: 'api', raw_data: {},
});

const mockSavedEvent = { _id: 'ball-event-db-id' };

beforeEach(() => {
  jest.clearAllMocks();
  Match.findOne.mockResolvedValue(mockMatch);
  BallEventModel.create.mockResolvedValue(mockSavedEvent);
  Offer.find.mockResolvedValue([mockOffer]);
  OfferTrigger.insertMany.mockResolvedValue([mockTrigger]);
});

describe('processBallEvent — validation', () => {
  it('throws when match_id is missing', async () => {
    const { match_id: _, ...rest } = baseBallEvent();
    await expect(processBallEvent(rest)).rejects.toThrow('Missing required field: match_id');
  });

  it('throws when source is missing', async () => {
    const { source: _, ...rest } = baseBallEvent();
    await expect(processBallEvent(rest)).rejects.toThrow('Missing required field: source');
  });
});

describe('processBallEvent — no match found', () => {
  it('returns empty array and does not fire offers when match is not in DB', async () => {
    Match.findOne.mockResolvedValue(null);
    const result = await processBallEvent(baseBallEvent());
    expect(result).toEqual([]);
    expect(OfferTrigger.insertMany).not.toHaveBeenCalled();
  });
});

describe('processBallEvent — dot ball (no trigger)', () => {
  it('returns empty array when no flag is true', async () => {
    const event = { ...baseBallEvent(), is_six: false, is_four: false, is_wicket: false, runs: 1 };
    const result = await processBallEvent(event);
    expect(result).toEqual([]);
    expect(OfferTrigger.insertMany).not.toHaveBeenCalled();
  });
});

describe('processBallEvent — no active offers', () => {
  it('returns empty array when no offers match', async () => {
    Offer.find.mockResolvedValue([]);
    const result = await processBallEvent(baseBallEvent());
    expect(result).toEqual([]);
    expect(OfferTrigger.insertMany).not.toHaveBeenCalled();
  });
});

describe('processBallEvent — successful trigger', () => {
  it('returns array of created OfferTrigger documents', async () => {
    const result = await processBallEvent(baseBallEvent());
    expect(result).toEqual([mockTrigger]);
  });

  it('sets expiresAt correctly as firedAt + durationSeconds', async () => {
    await processBallEvent(baseBallEvent());
    const [docs] = OfferTrigger.insertMany.mock.calls[0];
    const { firedAt, expiresAt } = docs[0];
    const diffSeconds = (expiresAt.getTime() - firedAt.getTime()) / 1000;
    expect(diffSeconds).toBe(mockOffer.durationSeconds);
  });

  it('queries offers with correct sportId and triggerEvent for a six', async () => {
    await processBallEvent(baseBallEvent());
    expect(Offer.find).toHaveBeenCalledWith(
      expect.objectContaining({ sportId: mockMatch.sport, triggerEvent: 'SIX' })
    );
  });

  it('maps is_four to FOUR trigger event', async () => {
    const event = { ...baseBallEvent(), is_six: false, is_four: true };
    await processBallEvent(event);
    expect(Offer.find).toHaveBeenCalledWith(
      expect.objectContaining({ triggerEvent: 'FOUR' })
    );
  });
});
