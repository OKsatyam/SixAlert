/**
 * Tests for DataSourceLog model — layer enum, required fields, TTL index, and optional fields.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import DataSourceLog from '../../src/models/data-source-log.js';

const validMatchId = new mongoose.Types.ObjectId();

const baseLog = () => ({
  matchId: validMatchId,
  layer: 1,
  success: true,
});

describe('DataSourceLog model', () => {
  describe('required fields', () => {
    ['matchId', 'layer', 'success'].forEach((field) => {
      it(`fails validation when ${field} is missing`, () => {
        const data = baseLog();
        delete data[field];
        expect(new DataSourceLog(data).validateSync().errors[field]).toBeDefined();
      });
    });

    it('passes validation with all required fields', () => {
      expect(new DataSourceLog(baseLog()).validateSync()).toBeUndefined();
    });
  });

  describe('layer enum', () => {
    it.each([1, 2, 3])('accepts valid layer %i', (layer) => {
      expect(new DataSourceLog({ ...baseLog(), layer }).validateSync()).toBeUndefined();
    });

    it('rejects layer 0', () => {
      expect(new DataSourceLog({ ...baseLog(), layer: 0 }).validateSync().errors.layer).toBeDefined();
    });

    it('rejects layer 4', () => {
      expect(new DataSourceLog({ ...baseLog(), layer: 4 }).validateSync().errors.layer).toBeDefined();
    });
  });

  describe('optional fields', () => {
    it('passes without responseMs, errorMessage, or endpoint', () => {
      expect(new DataSourceLog(baseLog()).validateSync()).toBeUndefined();
    });

    it('accepts responseMs as a number', () => {
      const log = new DataSourceLog({ ...baseLog(), responseMs: 342 });
      expect(log.responseMs).toBe(342);
    });

    it('fails when responseMs is negative', () => {
      const err = new DataSourceLog({ ...baseLog(), responseMs: -1 }).validateSync();
      expect(err.errors.responseMs).toBeDefined();
    });

    it('accepts errorMessage and endpoint as strings', () => {
      const log = new DataSourceLog({
        ...baseLog(),
        success: false,
        errorMessage: 'timeout after 5000ms',
        endpoint: 'https://api.cricapi.com/v1/currentMatches',
      });
      expect(log.errorMessage).toBe('timeout after 5000ms');
      expect(log.endpoint).toContain('cricapi');
    });
  });

  describe('indexes', () => {
    it('declares a compound index on matchId + layer', () => {
      const has = DataSourceLog.schema.indexes().some(
        ([fields]) => fields.matchId === 1 && fields.layer === 1
      );
      expect(has).toBe(true);
    });

    it('declares a TTL index on createdAt with 7-day expiry', () => {
      const ttlIndex = DataSourceLog.schema.indexes().find(
        ([fields, opts]) => fields.createdAt === 1 && opts.expireAfterSeconds === 604800
      );
      expect(ttlIndex).toBeDefined();
    });
  });
});
