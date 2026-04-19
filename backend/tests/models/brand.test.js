/**
 * Tests for Brand model — schema validation, required fields, and defaults.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import Brand from '../../src/models/brand.js';

const validSportId = new mongoose.Types.ObjectId();

describe('Brand model', () => {
  describe('required fields', () => {
    it('fails validation when name is missing', () => {
      const brand = new Brand({ slug: 'swiggy', sport: validSportId });
      const err = brand.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('fails validation when slug is missing', () => {
      const brand = new Brand({ name: 'Swiggy', sport: validSportId });
      const err = brand.validateSync();
      expect(err.errors.slug).toBeDefined();
    });

    it('fails validation when sport is missing', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy' });
      const err = brand.validateSync();
      expect(err.errors.sport).toBeDefined();
    });

    it('passes validation with name, slug, and sport', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy', sport: validSportId });
      const err = brand.validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('sets isActive to true by default', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy', sport: validSportId });
      expect(brand.isActive).toBe(true);
    });

    it('allows isActive to be explicitly set to false', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy', sport: validSportId, isActive: false });
      expect(brand.isActive).toBe(false);
    });
  });

  describe('slug formatting', () => {
    it('lowercases the slug automatically', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'SWIGGY', sport: validSportId });
      expect(brand.slug).toBe('swiggy');
    });

    it('trims whitespace from slug', () => {
      const brand = new Brand({ name: 'Swiggy', slug: '  swiggy  ', sport: validSportId });
      expect(brand.slug).toBe('swiggy');
    });
  });

  describe('sport ref', () => {
    it('stores sport as an ObjectId', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy', sport: validSportId });
      expect(brand.sport).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('fails validation when sport is not a valid ObjectId', () => {
      const brand = new Brand({ name: 'Swiggy', slug: 'swiggy', sport: 'not-an-id' });
      const err = brand.validateSync();
      expect(err.errors.sport).toBeDefined();
    });
  });
});
