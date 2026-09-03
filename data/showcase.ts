/**
 * Showcase events — things happening at the fest that people cannot register
 * for on the site. On-site sign-up, drop-in, or just watch.
 *
 * Kept static and separate from the database deliberately: these carry no fee
 * rows, no capacity, no tickets and no QR, so putting them in `events` would
 * mean every query that assumes a registerable event has to special-case them.
 *
 * Posters live in public/showcase/. Filenames must match exactly.
 */
export type ShowcaseEvent = {
    id: string;
    name: string;
    club: string;
    poster: string;
    /** Shown on the collapsed card. Keep to a few words. */
    day: string;
    time: string;
    venue: string;
    /** Optional pills, e.g. an on-site fee or a perk. Omit if there is nothing to say. */
    tags?: string[];
    description: string;
  };
  
  export const showcase: ShowcaseEvent[] = [
    {
      id: "robotics-rumble-racers",
      name: "Rumble Racers",
      club: "Robotics Club",
      poster: "/showcase/rumble-racers.webp",
      day: "Day 1–2",
      time: "TBA",
      venue: "TBA",
      tags: ["Rs. 50 on site", "2X Reward"],
      description:
        "Description coming soon — the event name is revealed on the day.",
    },
    {
      id: "vibe-tribe-band-performance",
      name: "Band Performance",
      club: "Vibe Tribe",
      poster: "/showcase/band-performance.webp",
      day: "Day 2",
      time: "TBA",
      venue: "TBA",
      tags: ["Live Performance"],
      description:
        "Description coming soon — the band name is revealed on the day.",
    },
  ];
  
  export default showcase;