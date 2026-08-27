/**
 * Event posters shown as a card background on hover (desktop only).
 *
 * Keyed by the event id that /api/events returns — NOT the display name, and
 * NOT the id in data/clubs.ts, which has drifted from the database. If a
 * poster silently fails to appear, check the key against /api/events first:
 * a key that doesn't match means the card never gets the has-poster class,
 * so nothing is even requested and there's no 404 to find in the Network tab.
 *
 * Extensions here must match public/posters/ exactly — the folder is a mix of
 * .png, .jpg and .jpeg.
 *
 * Only ids with a real file belong here. Anything listed without one 404s on
 * hover.
 */
export const posters: Record<string, string> = {
  "analytica-bidding-wars": "/posters/analytica-bidding-wars.jpg",
  "arts-uai-got-latent": "/posters/arts-uai-got-latent.png",
  "elc-campus-roadies": "/posters/elc-campus-roadies.jpg",
  "enactus-go-viral": "/posters/enactus-go-viral.png",
  "ethics-treasure-hunt": "/posters/ethics-treasure-hunt.jpeg",
  // The database id carries a -day-1 suffix; the file does not.
  "evac-fashion-show-day-1": "/posters/evac-fashion-show.png",
  "finx-venture-league": "/posters/finx-venture-league.png",
  "metamorphosis-naach-le-yaar": "/posters/metamorphosis-naach-le-yaar.png",
  "robotics-gameforge": "/posters/robotics-gameforge.jpg",
  "uic-boardroom-battle": "/posters/uic-boardroom-battle.png",
  "vibe-tribe-sa-re-ga-ma": "/posters/vibe-tribe-sa-re-ga-ma.jpg",
  "zalent-icon": "/posters/zalent-icon.jpeg",

  // Waiting on artwork — no file in public/posters/ yet:
  // "arts-naach-baraati": "/posters/arts-naach-baraati.png",

  // sports-futsal.png exists but "sports-side-futsal" is not among the 13
  // published events, so it is never requested. Safe to delete the file.
};

export default posters;
