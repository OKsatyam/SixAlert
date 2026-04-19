/**
 * Tests for Sport model — schema validation, required fields, and defaults.
 * Uses validateSync() so no live DB connection is needed.
 */
import Sport from '../../src/models/sport.js';

describe('Sport model', () => {
  describe('required fields', () => {
    it('fails validation when name is missing', () => {
      const sport = new Sport({ slug: 'cricket' });
      const err = sport.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('fails validation when slug is missing', () => {
      const sport = new Sport({ name: 'Cricket' });
      const err = sport.validateSync();
      expect(err.errors.slug).toBeDefined();
    });

    it('passes validation when both name and slug are provided', () => {
      const sport = new Sport({ name: 'Cricket', slug: 'cricket' });
      const err = sport.validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('sets isActive to true by default', () => {
      const sport = new Sport({ name: 'Cricket', slug: 'cricket' });
      expect(sport.isActive).toBe(true);
    });

    it('allows isActive to be explicitly set to false', () => {
      const sport = new Sport({ name: 'Cricket', slug: 'cricket', isActive: false });
      expect(sport.isActive).toBe(false);
    });
  });

  describe('slug formatting', () => {
    it('lowercases the slug automatically', () => {
      const sport = new Sport({ name: 'Cricket', slug: 'CRICKET' });
      expect(sport.slug).toBe('cricket');
    });

    it('trims whitespace from slug', () => {
      const sport = new Sport({ name: 'Cricket', slug: '  cricket  ' });
      expect(sport.slug).toBe('cricket');
    });
  });
});
