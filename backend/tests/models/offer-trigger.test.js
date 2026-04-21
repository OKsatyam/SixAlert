/**
 * Tests for OfferTrigger model — required refs, defaults, and index declarations.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import OfferTrigger from '../../src/models/offer-trigger.js';

const ids = {
  offer: new mongoose.Types.ObjectId(),
  match: new mongoose.Types.ObjectId(),
  ballEvent: new mongoose.Types.ObjectId(),
};

const baseTrigger = () => ({
  offerId: ids.offer,
  matchId: ids.match,
  ballEventId: ids.ballEvent,
  expiresAt: new Date(Date.now() + 600_000),
});

describe('OfferTrigger model', () => {
  describe('required fields', () => {
    ['offerId', 'matchId', 'ballEventId', 'expiresAt'].forEach((field) => {
      it(`fails validation when ${field} is missing`, () => {
        const data = baseTrigger();
        delete data[field];
        const err = new OfferTrigger(data).validateSync();
        expect(err.errors[field]).toBeDefined();
      });
    });

    it('passes validation with all required fields', () => {
      expect(new OfferTrigger(baseTrigger()).validateSync()).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('sets isExpired to false by default', () => {
      expect(new OfferTrigger(baseTrigger()).isExpired).toBe(false);
    });

    it('sets firedAt to a date by default', () => {
      const trigger = new OfferTrigger(baseTrigger());
      expect(trigger.firedAt).toBeInstanceOf(Date);
    });
  });

  describe('ObjectId refs', () => {
    ['offerId', 'matchId', 'ballEventId'].forEach((field) => {
      it(`stores ${field} as an ObjectId`, () => {
        const trigger = new OfferTrigger(baseTrigger());
        expect(trigger[field]).toBeInstanceOf(mongoose.Types.ObjectId);
      });

      it(`fails when ${field} is not a valid ObjectId`, () => {
        const err = new OfferTrigger({ ...baseTrigger(), [field]: 'bad-id' }).validateSync();
        expect(err.errors[field]).toBeDefined();
      });
    });
  });

  describe('indexes', () => {
    it('declares an index on firedAt', () => {
      const has = OfferTrigger.schema.indexes().some(([fields]) => fields.firedAt === 1);
      expect(has).toBe(true);
    });

    it('declares a compound index on matchId + firedAt', () => {
      const has = OfferTrigger.schema.indexes().some(
        ([fields]) => fields.matchId === 1 && fields.firedAt === -1
      );
      expect(has).toBe(true);
    });
  });
});
