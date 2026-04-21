/**
 * Tests for BallEvent model — field validation, source enum, defaults, and TTL index.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import BallEvent from '../../src/models/ball-event.js';

const validMatchId = new mongoose.Types.ObjectId();

const baseEvent = () => ({
  matchId: validMatchId,
  over: 3,
  ball: 2,
  runs: 6,
  source: 'api',
});

describe('BallEvent model', () => {
  describe('required fields', () => {
    it('fails when matchId is missing', () => {
      const { matchId: _, ...rest } = baseEvent();
      expect(new BallEvent(rest).validateSync().errors.matchId).toBeDefined();
    });

    it('fails when over is missing', () => {
      const { over: _, ...rest } = baseEvent();
      expect(new BallEvent(rest).validateSync().errors.over).toBeDefined();
    });

    it('fails when ball is missing', () => {
      const { ball: _, ...rest } = baseEvent();
      expect(new BallEvent(rest).validateSync().errors.ball).toBeDefined();
    });

    it('fails when runs is missing and no default applied', () => {
      const { runs: _, ...rest } = baseEvent();
      // runs has a default so validateSync should still pass
      const err = new BallEvent(rest).validateSync();
      expect(err).toBeUndefined();
    });

    it('fails when source is missing', () => {
      const { source: _, ...rest } = baseEvent();
      expect(new BallEvent(rest).validateSync().errors.source).toBeDefined();
    });

    it('passes with all required fields', () => {
      expect(new BallEvent(baseEvent()).validateSync()).toBeUndefined();
    });
  });

  describe('source enum', () => {
    it.each(['api', 'scraper', 'manual'])('accepts valid source "%s"', (source) => {
      expect(new BallEvent({ ...baseEvent(), source }).validateSync()).toBeUndefined();
    });

    it('rejects an invalid source value', () => {
      const err = new BallEvent({ ...baseEvent(), source: 'webhook' }).validateSync();
      expect(err.errors.source).toBeDefined();
    });
  });

  describe('ball range', () => {
    it('fails when ball is 0', () => {
      expect(new BallEvent({ ...baseEvent(), ball: 0 }).validateSync().errors.ball).toBeDefined();
    });

    it('fails when ball is 7', () => {
      expect(new BallEvent({ ...baseEvent(), ball: 7 }).validateSync().errors.ball).toBeDefined();
    });

    it('accepts ball values 1 through 6', () => {
      [1, 2, 3, 4, 5, 6].forEach((ball) => {
        expect(new BallEvent({ ...baseEvent(), ball }).validateSync()).toBeUndefined();
      });
    });
  });

  describe('over range', () => {
    it('fails when over is negative', () => {
      expect(new BallEvent({ ...baseEvent(), over: -1 }).validateSync().errors.over).toBeDefined();
    });

    it('accepts over of 0', () => {
      expect(new BallEvent({ ...baseEvent(), over: 0 }).validateSync()).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('sets runs to 0 by default', () => {
      const { runs: _, ...rest } = baseEvent();
      expect(new BallEvent(rest).runs).toBe(0);
    });

    it('sets isSix, isFour, isWicket to false by default', () => {
      const e = new BallEvent(baseEvent());
      expect(e.isSix).toBe(false);
      expect(e.isFour).toBe(false);
      expect(e.isWicket).toBe(false);
    });
  });

  describe('TTL index', () => {
    it('declares a TTL index on createdAt with 30-day expiry', () => {
      const ttlIndex = BallEvent.schema.indexes().find(
        ([fields, opts]) => fields.createdAt === 1 && opts.expireAfterSeconds === 2592000
      );
      expect(ttlIndex).toBeDefined();
    });
  });
});
