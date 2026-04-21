/**
 * Tests for Match model — status enum, teams validation, required fields, and defaults.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import Match from '../../src/models/match.js';

const validSportId = new mongoose.Types.ObjectId();

const baseMatch = () => ({
  externalId: 'cricapi-match-001',
  sport: validSportId,
  teams: ['Mumbai Indians', 'Chennai Super Kings'],
});

describe('Match model', () => {
  describe('required fields', () => {
    it('fails validation when externalId is missing', () => {
      const { externalId: _, ...rest } = baseMatch();
      const err = new Match(rest).validateSync();
      expect(err.errors.externalId).toBeDefined();
    });

    it('fails validation when sport is missing', () => {
      const { sport: _, ...rest } = baseMatch();
      const err = new Match(rest).validateSync();
      expect(err.errors.sport).toBeDefined();
    });

    it('fails validation when teams is missing', () => {
      const { teams: _, ...rest } = baseMatch();
      const err = new Match(rest).validateSync();
      expect(err.errors.teams).toBeDefined();
    });

    it('passes validation with all required fields', () => {
      const err = new Match(baseMatch()).validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe('status enum', () => {
    it('defaults to "scheduled"', () => {
      const match = new Match(baseMatch());
      expect(match.status).toBe('scheduled');
    });

    it.each(['scheduled', 'live', 'completed', 'abandoned'])(
      'accepts valid status "%s"',
      (status) => {
        const err = new Match({ ...baseMatch(), status }).validateSync();
        expect(err).toBeUndefined();
      }
    );

    it('rejects an invalid status value', () => {
      const err = new Match({ ...baseMatch(), status: 'paused' }).validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('teams validation', () => {
    it('fails when teams has only one entry', () => {
      const err = new Match({ ...baseMatch(), teams: ['Mumbai Indians'] }).validateSync();
      expect(err.errors.teams).toBeDefined();
    });

    it('fails when teams has three entries', () => {
      const err = new Match({ ...baseMatch(), teams: ['MI', 'CSK', 'RCB'] }).validateSync();
      expect(err.errors.teams).toBeDefined();
    });

    it('fails when a team name is an empty string', () => {
      const err = new Match({ ...baseMatch(), teams: ['MI', ''] }).validateSync();
      expect(err.errors.teams).toBeDefined();
    });
  });

  describe('defaults', () => {
    it('sets currentOver to 0', () => {
      expect(new Match(baseMatch()).currentOver).toBe(0);
    });

    it('sets currentBall to 0', () => {
      expect(new Match(baseMatch()).currentBall).toBe(0);
    });
  });
});
