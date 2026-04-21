/**
 * trigger-engine.js — core offer firing logic.
 * Receives a raw BallEvent from the worker, finds matching active Offers,
 * creates OfferTrigger documents, and broadcasts to WebSocket clients.
 */
import BallEventModel from '../../models/ball-event.js';
import Match from '../../models/match.js';
import Offer from '../../models/offer.js';
import OfferTrigger from '../../models/offer-trigger.js';
import { broadcastOfferTrigger, broadcastMatchUpdate } from '../events/event-broadcaster.js';
import logger from '../../utils/logger.js';

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
  return null;
};

// wsServer is optional — if null, triggers are created but not broadcast
const processBallEvent = async (ballEvent, wsServer = null) => {
  validate(ballEvent);

  const match = await Match.findOne({ externalId: ballEvent.match_id });
  if (!match) {
    logger.warn(`processBallEvent: no match found for externalId=${ballEvent.match_id}`);
    return [];
  }

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

  // update live match position so the frontend gets accurate over/ball state
  await Match.findByIdAndUpdate(match._id, {
    currentOver: ballEvent.over,
    currentBall: ballEvent.ball,
  });

  if (wsServer) {
    broadcastMatchUpdate(wsServer, {
      ...match.toObject(),
      currentOver: ballEvent.over,
      currentBall: ballEvent.ball,
    });
  }

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
      const expiresAt = new Date(firedAt.getTime() + offer.durationSeconds * 1000);
      return { offerId: offer._id, matchId: match._id, ballEventId: savedEvent._id, firedAt, expiresAt };
    })
  );

  // broadcast each trigger to connected WebSocket clients
  if (wsServer) {
    await Promise.all(triggers.map((t) => broadcastOfferTrigger(wsServer, t)));
  }

  logger.info(`processBallEvent: ${triggers.length} offer(s) fired — match=${ballEvent.match_id} event=${triggerEvent}`);
  return triggers;
};

export { processBallEvent };
