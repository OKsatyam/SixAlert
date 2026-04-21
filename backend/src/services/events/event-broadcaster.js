/**
 * event-broadcaster.js — builds typed WebSocket payloads and broadcasts them.
 * Decouples the trigger engine from the WebSocket server by handling payload
 * construction and population in one place.
 */
import OfferTrigger from '../../models/offer-trigger.js';
import logger from '../../utils/logger.js';

/**
 * Broadcast an OFFER_TRIGGERED event to all clients watching the match.
 * Populates offerId → offer → brandId so the payload carries full brand details.
 * Silently returns if no clients are connected to that room.
 */
const broadcastOfferTrigger = async (wsServer, offerTrigger) => {
  const populated = await OfferTrigger.findById(offerTrigger._id)
    .populate({ path: 'offerId', populate: { path: 'brandId' } });

  if (!populated) {
    logger.warn(`broadcastOfferTrigger: OfferTrigger ${offerTrigger._id} not found`);
    return;
  }

  const offer = populated.offerId;
  const brand = offer.brandId;
  const matchId = String(populated.matchId);

  const payload = {
    type: 'OFFER_TRIGGERED',
    matchId,
    offer: {
      id: String(offer._id),
      title: offer.title,
      brand: brand.name,
      logoUrl: brand.logoUrl ?? '',
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      durationSeconds: offer.durationSeconds,
      expiresAt: populated.expiresAt.toISOString(),
    },
  };

  const stats = wsServer.getStats();
  if (!stats.rooms[matchId]) {
    logger.info(`broadcastOfferTrigger: no clients in match=${matchId}, skipping broadcast`);
    return;
  }

  wsServer.broadcastToMatch(matchId, payload);
  logger.info(`broadcastOfferTrigger: sent OFFER_TRIGGERED to match=${matchId}`);
};

/**
 * Broadcast a MATCH_UPDATE event with current live match state.
 * Called after each ball event is processed to keep clients in sync.
 */
const broadcastMatchUpdate = (wsServer, match) => {
  const matchId = String(match._id);

  const payload = {
    type: 'MATCH_UPDATE',
    matchId,
    currentOver: match.currentOver,
    currentBall: match.currentBall,
    status: match.status,
  };

  const stats = wsServer.getStats();
  if (!stats.rooms[matchId]) {
    return; // no clients watching — not an error, common for scheduled matches
  }

  wsServer.broadcastToMatch(matchId, payload);
};

export { broadcastOfferTrigger, broadcastMatchUpdate };
