/**
 * Tests for Offer model — enum validation, required fields, and defaults.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import Offer from '../../src/models/offer.js';

const validBrandId = new mongoose.Types.ObjectId();
const validSportId = new mongoose.Types.ObjectId();

const baseOffer = () => ({
  brandId: validBrandId,
  sportId: validSportId,
  title: 'Swiggy 66% off',
  triggerEvent: 'SIX',
  discountType: 'percentage',
  discountValue: 66,
  durationSeconds: 600,
  validFrom: new Date('2025-03-01'),
  validTo: new Date('2025-05-31'),
});

describe('Offer model', () => {
  describe('required fields', () => {
    const requiredFields = [
      'brandId', 'sportId', 'title', 'triggerEvent',
      'discountType', 'discountValue', 'durationSeconds', 'validFrom', 'validTo',
    ];

    requiredFields.forEach((field) => {
      it(`fails validation when ${field} is missing`, () => {
        const data = baseOffer();
        delete data[field];
        const err = new Offer(data).validateSync();
        expect(err.errors[field]).toBeDefined();
      });
    });

    it('passes validation with all required fields', () => {
      expect(new Offer(baseOffer()).validateSync()).toBeUndefined();
    });
  });

  describe('triggerEvent enum', () => {
    it.each(['SIX', 'FOUR', 'WICKET', 'MATCH_START', 'MATCH_END'])(
      'accepts valid triggerEvent "%s"',
      (triggerEvent) => {
        expect(new Offer({ ...baseOffer(), triggerEvent }).validateSync()).toBeUndefined();
      }
    );

    it('rejects an invalid triggerEvent', () => {
      const err = new Offer({ ...baseOffer(), triggerEvent: 'BOUNDARY' }).validateSync();
      expect(err.errors.triggerEvent).toBeDefined();
    });
  });

  describe('discountType enum', () => {
    it.each(['percentage', 'flat', 'free_delivery'])(
      'accepts valid discountType "%s"',
      (discountType) => {
        expect(new Offer({ ...baseOffer(), discountType }).validateSync()).toBeUndefined();
      }
    );

    it('rejects an invalid discountType', () => {
      const err = new Offer({ ...baseOffer(), discountType: 'cashback' }).validateSync();
      expect(err.errors.discountType).toBeDefined();
    });
  });

  describe('discountValue', () => {
    it('fails when discountValue is negative', () => {
      const err = new Offer({ ...baseOffer(), discountValue: -1 }).validateSync();
      expect(err.errors.discountValue).toBeDefined();
    });

    it('accepts discountValue of 0', () => {
      expect(new Offer({ ...baseOffer(), discountValue: 0 }).validateSync()).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('sets isActive to true by default', () => {
      expect(new Offer(baseOffer()).isActive).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('passes without description or terms', () => {
      expect(new Offer(baseOffer()).validateSync()).toBeUndefined();
    });
  });
});
