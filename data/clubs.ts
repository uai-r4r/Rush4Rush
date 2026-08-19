export type ClubEvent = {
  id: string;
  clubs: string[];
  eventName: string;
  tagline: string;
  description: string;
  fee: number;
  day: 1 | 2;
  startTime: string;
  endTime: string;
  venue: string;
  category: "Culture" | "Business" | "Tech" | "Sports" | "Social";
  teamSize: string;
};

// TODO: real fees
// TODO: confirm final event times and venues
export const clubEvents: ClubEvent[] = [
  {
    id: "rotaract-traitors",
    clubs: ["Rotaract"],
    eventName: "Traitors",
    tagline: "Trust no one. Read every move.",
    description:
      "A 2.5 to 3-hour social deduction game where players are secretly assigned as Traitors or Faithfuls.Faithfuls work through team missions and voting rounds to uncover hidden Traitors before getting eliminated.Designed to test strategic thinking, teamwork, and communication in an engaging, competitive setup.",
    fee: 0,
    day: 1,
    startTime: "10:00",
    endTime: "12:00",
    venue: "Main Auditorium",
    category: "Social",
    teamSize: "Teams of 4",
  },
  {
    id: "sports-futsal",
    clubs: ["Sports Club"],
    eventName: "Futsal Tournament",
    tagline: "Small pitch. Big energy.",
    description:
      "An inter-college 5-a-side futsal tournament bringing together teams to compete in a fast-paced environment.Features knockout stages leading into quarter-finals, semi-finals, and finals over a 1 to 2-day period.Designed to promote teamwork, discipline, sportsmanship, and healthy competition among students across colleges.",
    fee: 0,
    day: 1,
    startTime: "10:00",
    endTime: "13:00",
    venue: "Sports Arena",
    category: "Sports",
    teamSize: "Teams of 7",
  },
  {
    id: "matchbox-project-x",
    clubs: ["Matchbox"],
    eventName: "Project X",
    tagline: "Make the night legendary.",
    description:
      "A creative challenge built around bold ideas, quick collaboration, and a little controlled chaos. Expect surprises at every turn.",
    fee: 0,
    day: 1,
    startTime: "12:00",
    endTime: "14:00",
    venue: "Innovation Lab",
    category: "Social",
    teamSize: "Teams of 4",
  },
  {
    id: "alumni-business-quiz",
    clubs: ["Alumni"],
    eventName: "Business Quiz",
    tagline: "Know the game behind the game.",
    description:
      "Test your business IQ across brands, markets, founders, and the decisions that shape industries. Only the quickest minds make the final round.",
    fee: 0,
    day: 1,
    startTime: "12:00",
    endTime: "14:00",
    venue: "Seminar Hall A",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    id: "arts-uai-got-latent",
    clubs: ["Arts and Culture"],
    eventName: "UAI Got Latent",
    tagline: "The stage is yours to disrupt.",
    description:
      "A talent showcase for the unexpected, the unfiltered, and the unforgettable. Step into the spotlight and let your hidden talent take over.",
    fee: 0,
    day: 1,
    startTime: "14:00",
    endTime: "16:00",
    venue: "Open Stage",
    category: "Culture",
    teamSize: "Solo",
  },
  {
    id: "arts-naach-baraati",
    clubs: ["Arts and Culture"],
    eventName: "Naach Baraati Naach",
    tagline: "Dance like the baraat is watching.",
    description:
      "Turn celebration into choreography in this high-colour dance battle. Bring your crew, your signature moves, and your loudest energy.",
    fee: 0,
    day: 1,
    startTime: "16:00",
    endTime: "18:00",
    venue: "Central Courtyard",
    category: "Culture",
    teamSize: "Teams of 4",
  },
  {
    id: "elc-campus-roadies",
    clubs: ["ELC"],
    eventName: "Campus Roadies",
    tagline: "Courage, chaos, campus.",
    description:
      "A series of mental, physical, and social challenges designed to test how far you can go. Adapt quickly and never lose your team.",
    fee: 0,
    day: 1,
    startTime: "14:00",
    endTime: "17:00",
    venue: "Activity Zone",
    category: "Social",
    teamSize: "Teams of 4",
  },
  {
    id: "finx-venture-league",
    clubs: ["FINX"],
    eventName: "Venture League",
    tagline: "Pitch big. Think bigger.",
    description:
      "Build a venture from the ground up and prove your idea under pressure. Strategy, storytelling, and commercial instinct decide the winners.",
    fee: 0,
    day: 1,
    startTime: "16:00",
    endTime: "18:00",
    venue: "Boardroom",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    id: "uic-boardroom-battle",
    clubs: ["UIC"],
    eventName: "Boardroom Battle",
    tagline: "Every decision has a price.",
    description:
      "Step into an executive simulation where every call changes the game. Navigate competition, risk, and opportunity to take the top seat.",
    fee: 0,
    day: 1,
    startTime: "18:00",
    endTime: "20:00",
    venue: "Executive Hall",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    id: "ethics-treasure-hunt",
    clubs: ["Ethics & CSR"],
    eventName: "Treasure Hunt",
    tagline: "Follow the clues. Find the signal.",
    description:
      "Decode clues, solve puzzles, and explore the campus through a challenge with a conscience. Collaboration is your most valuable compass.",
    fee: 0,
    day: 1,
    startTime: "18:00",
    endTime: "20:00",
    venue: "Campus-wide",
    category: "Social",
    teamSize: "Teams of 4",
  },
  {
    // Combined event: Dramatics x Techops
    // TODO: confirm merged slot, venue and category with both clubs
    id: "dramatics-techops-level-up",
    clubs: ["Dramatics", "Techops"],
    eventName: "Level Up",
    tagline: "Improvise fast. Build faster.",
    description:
      "A joint challenge from Dramatics and Techops where performance meets problem-solving. Take the prompt, think on your feet, and turn a live brief into something that actually works.",
    fee: 0,
    day: 2,
    startTime: "10:00",
    endTime: "13:00",
    venue: "Black Box Theatre",
    category: "Culture",
    teamSize: "Teams of 4",
  },
  {
    id: "analytica-bidding-wars",
    clubs: ["Analytica"],
    eventName: "Bidding Wars",
    tagline: "Data is power. Budget is survival.",
    description:
      "Use evidence, timing, and calculated risk to win the assets that matter. A competitive analytics game where one bad bid changes everything.",
    fee: 0,
    day: 2,
    startTime: "10:00",
    endTime: "12:00",
    venue: "Analytics Hub",
    category: "Tech",
    teamSize: "Teams of 4",
  },
  {
    id: "environment-final-truth",
    clubs: ["Environment"],
    eventName: "The Final Truth",
    tagline: "Question the story you inherited.",
    description:
      "Uncover the facts behind complex environmental choices in a fast-paced investigation. Think critically, connect the clues, and find the final truth.",
    fee: 0,
    day: 2,
    startTime: "12:00",
    endTime: "14:00",
    venue: "Seminar Hall B",
    category: "Social",
    teamSize: "Teams of 4",
  },
  {
    id: "vibe-tribe-sa-re-ga-ma",
    clubs: ["Vibe Tribe"],
    eventName: "Sa Re Ga Ma of UAI",
    tagline: "Let the campus sing.",
    description:
      "A musical face-off where range, rhythm, and stage presence take centre stage. Sing solo or bring a team that knows how to harmonise.",
    fee: 0,
    day: 2,
    startTime: "12:00",
    endTime: "14:00",
    venue: "Main Auditorium",
    category: "Culture",
    teamSize: "Solo",
  },
  {
    // Combined event: HR x Equinoxxx
    // TODO: confirm merged slot and venue with both clubs
    id: "hr-equinoxxx-object-beats",
    clubs: ["HR", "Equinoxxx"],
    eventName: "Bollywood Object Beats",
    tagline: "Anything can be an instrument.",
    description:
      "Create rhythm from the everyday in a playful Bollywood-inspired beat battle. Bring your imagination, your coordination, and turn ordinary objects into a performance.",
    fee: 0,
    day: 2,
    startTime: "14:00",
    endTime: "16:00",
    venue: "Central Courtyard",
    category: "Culture",
    teamSize: "Teams of 4",
  },
  {
    id: "enactus-go-viral",
    clubs: ["Enactus"],
    eventName: "Go Viral: The Plot Twist",
    tagline: "Make impact impossible to scroll past.",
    description:
      "Build a campaign around a social idea and give it a plot twist that makes people care. Creativity meets purpose in this communications sprint.",
    fee: 0,
    day: 2,
    startTime: "16:00",
    endTime: "18:00",
    venue: "Media Studio",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    id: "zalent-icon",
    clubs: ["Zalent"],
    eventName: "Zalent Icon: Battle of the Brand Ambassadors",
    tagline: "Own the brand. Become the icon.",
    description:
      "Step into the shoes of a brand ambassador and sell the story with confidence. Presence, persuasion, and personality will set the icons apart.",
    fee: 0,
    day: 1,
    startTime: "14:00",
    endTime: "16:00",
    venue: "Brand Arena",
    category: "Business",
    teamSize: "Solo",
  },
  {
    id: "evac-fashion-show",
    clubs: ["EVAC"],
    eventName: "Fashion Show",
    tagline: "Walk into the future.",
    description:
      "A runway built for bold silhouettes, sharp concepts, and unforgettable entrances. Style the moment and make the whole campus look twice.",
    fee: 0,
    day: 1,
    startTime: "18:00",
    endTime: "20:00",
    venue: "Festival Grounds",
    category: "Culture",
    teamSize: "Teams of 4",
  },
  {
    id: "robotics-gameforge",
    clubs: ["Robotics"],
    eventName: "GameForge",
    tagline: "Build the fun from scratch.",
    description:
      "Design, prototype, and play your way through a challenge where engineering meets game design. The best builds are clever, playable, and memorable.",
    fee: 0,
    day: 2,
    startTime: "10:00",
    endTime: "13:00",
    venue: "Robotics Lab",
    category: "Tech",
    teamSize: "Teams of 4",
  },
  {
    id: "metamorphosis-naach-le-yaar",
    clubs: ["Metamorphosis"],
    eventName: "Naach Le Yaar",
    tagline: "Find the beat in your people.",
    description:
      "An open-floor dance experience celebrating friendship, freedom, and fearless movement. Come ready to learn, perform, and leave lighter than you arrived.",
    fee: 0,
    day: 2,
    startTime: "16:00",
    endTime: "18:00",
    venue: "Open Stage",
    category: "Culture",
    teamSize: "Teams of 4",
  },
];

export default clubEvents;