/**
 * trigger-engine.js — core offer firing logic.
 * Receives a raw BallEvent from the worker, finds matching active Offers,
 * and creates one OfferTrigger document per matching offer.
 */
import BallEventModel from '../../models/ball-event.js';
import Match from '../../models/match.js';
import Offer from '../../models/offer.js';
import OfferTrigger from '../../models/offer-trigger.js';
import logger from '../../utils/logger.js';

// maps incoming worker flags to the Offer.triggerEvent enum values
const TRIGGER_MAP = {
  is_six: 'SIX',
  is_four: 'FOUR',
  is_wicket: 'WICKET',
};

const REQUIRED_FIELDS = ['match_id', 'over', 'ball', 'runs', 'source'];

const validate = (ballEvent) => {
  for (const field of REQUIRED_FIELDS) {
    if (ballEvent[field] === undefined || ballEvent[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
};

const getTriggerEvent = (ballEvent) => {
  for (const [flag, event] of Object.entries(TRIGGER_MAP)) {
    if (ballEvent[flag] === true) return event;
  }
  return null; // dot ball / regular run — no offer fires
};

const processBallEvent = async (ballEvent) => {
  validate(ballEvent);

  const match = await Match.findOne({ externalId: ballEvent.match_id });
  if (!match) {
    logger.warn(`processBallEvent: no match found for externalId=${ballEvent.match_id}`);
    return [];
  }

  // persist the incoming ball event regardless of whether offers fire
  const savedEvent = await BallEventModel.create({
    matchId: match._id,
    over: ballEvent.over,
    ball: ballEvent.ball,
    runs: ballEvent.runs,
    isSix: ballEvent.is_six ?? false,
    isFour: ballEvent.is_four ?? false,
    isWicket: ballEvent.is_wicket ?? false,
    batsman: ballEvent.batsman ?? '',
    bowler: ballEvent.bowler ?? '',
    source: ballEvent.source,
    rawData: ballEvent.raw_data ?? {},
  });

  const triggerEvent = getTriggerEvent(ballEvent);
  if (!triggerEvent) return [];

  const now = new Date();
  const activeOffers = await Offer.find({
    sportId: match.sport,
    triggerEvent,
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  });

  if (activeOffers.length === 0) return [];

  const triggers = await OfferTrigger.insertMany(
    activeOffers.map((offer) => {
      const firedAt = now;
      // expiresAt is always set by the engine — never by the schema default
      const expiresAt = new Date(firedAt.getTime() + offer.durationSeconds * 1000);
      return {
        offerId: offer._id,
        matchId: match._id,
        ballEventId: savedEvent._id,
        firedAt,
        expiresAt,
      };
    })
  );

  logger.info(
    `processBallEvent: ${triggers.length} offer(s) fired — match=${ballEvent.match_id} event=${triggerEvent}`
  );

  return triggers;
};

export { processBallEvent };
