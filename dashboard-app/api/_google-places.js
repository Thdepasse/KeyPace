// Aide Google Places API (endpoints legacy, simples à appeler en GET signé
// par une clé) pour la synchro des avis Google (voir syncGoogleReviews dans
// dashboard.js). findPlace sert à retrouver le Place ID par nom, une seule
// fois lors de la mise en place — fetchPlaceReviews fait la synchro courante.
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// La recherche par nom (textquery) fait du matching flou et peut renvoyer des
// établissements sans rapport (ex. homonymes approximatifs à proximité). Une
// recherche par numéro de téléphone (au format international) est beaucoup
// plus fiable pour retrouver sa propre fiche : on la détecte automatiquement.
const PHONE_LIKE = /^\+?[\d\s().-]{6,}$/;

async function findPlace(apiKey, query) {
  const inputType = PHONE_LIKE.test(query.trim()) ? 'phonenumber' : 'textquery';
  const url = `${PLACES_BASE}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=${inputType}&fields=place_id,name,formatted_address&key=${apiKey}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places (findplacefromtext) : ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`);
  }
  return data.candidates || [];
}

async function fetchPlaceReviews(apiKey, placeId) {
  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total,url,name&key=${apiKey}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status !== 'OK') {
    throw new Error(`Google Places (details) : ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`);
  }
  const result = data.result || {};
  return {
    name: result.name,
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    mapsUrl: result.url,
    reviews: result.reviews || [],
  };
}

module.exports = { findPlace, fetchPlaceReviews };
