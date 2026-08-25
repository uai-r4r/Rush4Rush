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
      "A 2.5 to 3-hour social deduction game where players are secretly assigned as Traitors or Faithfuls. Faithfuls work through team missions and voting rounds to uncover hidden Traitors before getting eliminated. Designed to test strategic thinking, teamwork, and communication in an engaging, competitive setup. SPOC: Naman – 9833196308, Isha Verma – 6263027073.",
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
      "An inter-college 5-a-side futsal tournament bringing together teams to compete in a fast-paced environment. Features knockout stages leading into quarter-finals, semi-finals, and finals over a 1 to 2-day period. Designed to promote teamwork, discipline, sportsmanship, and healthy competition among students across colleges. SPOC: Manish Manhas – 6006722996, Ananya Soni – 8109397727.",
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
    tagline: "Five rounds. One Market Titan.",
    description:
      "A one-day, single-elimination marketing reality competition where 40 contestants battle through five high-adrenaline rounds — blindfolds, water balloons, betrayal votes, and live pitches — each disguised as a real marketing skill: branding, pricing, negotiation, crisis PR. Judged by the Board and fuelled by crowd energy, it ends with one contestant crowned The Market Titan. Designed to be resume-worthy, highly shareable, and the club's signature annual flagship event. SPOC: Adiktya Bhatt – 6263344961, Lakshita Jha – 7067672168.",
    fee: 0,
    day: 1,
    startTime: "12:00",
    endTime: "14:00",
    venue: "Innovation Lab",
    category: "Business",
    teamSize: "Solo",
  },
  {
    id: "alumni-business-quiz",
    clubs: ["Alumni"],
    eventName: "Business Quiz",
    tagline: "Know the game behind the game.",
    description:
      "A competitive quiz focused on business, brands, marketing, startups, and current business affairs. Engaging rounds designed to test how closely you follow the companies and decisions shaping the market. SPOC: Ayushi Shrivastava – 7392017991, Indrashis Day – 6290906168.",
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
    tagline: "Bring the baraat to the floor.",
    description:
      "A dance competition set around a Band Baaja Baraat wedding theme, open to all students. Participants perform Bollywood, Bhangra, Garba, and other festive Indian dance styles in traditional attire. Judged on performance, confidence, expression, and theme relevance, with solo and group entries competing across a lively 2 to 3-hour show. SPOC: Utkarsh – 6390151860, Tanisha – 6386565075.",
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
    tagline: "Pick your wedding persona.",
    description:
      "A university-wide, wedding-themed talent showcase where every participant performs as a unique wedding persona — Dulhe Ka Mama, DJ Wala, and more — in festive attire. There is no host: a judging panel drives the whole show, interacting live with contestants and the audience. Features a self-rating challenge where matching your predicted score wins a prize, and crowns three to five winners across categories like Best Wedding Persona and Judges' Special Choice. SPOC: Adrika – 7977086339, Janhvi – 9987634569.",
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
      "A 4 to 5-day, Roadies-inspired adventure competition featuring physical endurance, strategy, and teamwork challenges with progressive eliminations. Seventy to eighty contestants face obstacle courses, treasure hunts, surprise twists, and immunity cards across evolving daily rounds. Builds leadership, resilience, and audience engagement, culminating in a high-intensity grand finale and championship round. Prize: Winner gets Rs. 3000. SPOC: Rutvi Parekh – 9909076100, Vallabh Dixit – 6380324734.",
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
      "A startup competition where two-member teams turn ideas into practical ventures across three phases: idea pitch, financial model, and final presentation before judges. Open to all students via Unstop registration, with judging on innovation, market validation, feasibility, and pitch quality. Prize: Winner takes home a Rs. 1000 cash prize and a certificate. SPOC: Mann Jain – 7249040723, Dhanashri – 9561305111, Shriraj Indurkar – 7798257928.",
    fee: 0,
    day: 1,
    startTime: "10:00",
    endTime: "17:00",
    venue: "Boardroom",
    category: "Business",
    teamSize: "Teams of 2",
  },
  {
    id: "uic-boardroom-battle",
    clubs: ["UIC"],
    eventName: "Boardroom Battle",
    tagline: "Every decision has a price.",
    description:
      "A 3.5-hour, one-day event combining a quiz competition and case study analysis. Round one tests participants' knowledge across a broad range of topics; round two challenges them to solve real-time case studies, showcasing analytical thinking and problem-solving under pressure. Prize: Winner gets prize money (amount to be confirmed). SPOC: Gayatri Hanumante – 9890978505, Aryan Gentyala – 8850478532, Harman – 8299341988.",
    fee: 0,
    day: 1,
    startTime: "11:15",
    endTime: "16:00",
    venue: "Executive Hall",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    // TODO: club has not finalised the event blueprint — replace this description
    id: "ethics-treasure-hunt",
    clubs: ["Ethics & CSR"],
    eventName: "Treasure Hunt",
    tagline: "Follow the clues. Find the signal.",
    description:
      "The detailed event blueprint is still being finalized. Prize: Winner – Rs. 1000, Runner Up – Rs. 700, Second Runner Up – Rs. 500. SPOC: Digansh Upadhyay – 7976867289, Yakshi Ghoyal – 6266103288.",
    fee: 0,
    day: 1,
    startTime: "13:00",
    endTime: "15:30",
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
    tagline: "Six games. Two days. One winner.",
    description:
      "Six events across the two days: two mobile titles, two on PlayStation, one PC title, and one on-ground social game hosted by the Dramatics Club. Console and PC events run as tournaments with a committed audience, mobile events drive participation and volume, and the social format keeps walk-ins engaged between rounds. SPOC (Dramatics): Shubhankar – 6291423212, Dimpy – 8587857032. SPOC (Techops): Abdullah Shah – 8828082665, Arkhipus Christian – 7043996387, Kunal Mhatre – 8450915006.",
    fee: 0,
    day: 2,
    startTime: "14:00",
    endTime: "17:00",
    venue: "Black Box Theatre",
    category: "Tech",
    teamSize: "Teams of 4",
  },
  {
    id: "analytica-bidding-wars",
    clubs: ["Analytica"],
    eventName: "Bidding Wars",
    tagline: "Data is power. Budget is survival.",
    description:
      "Teams bid limited funds to build a custom seven-column dataset (with numerical and categorical columns), then receive 500 rows of data to analyse, visualise, and draw insights from using Excel, Power BI, and AI tools within a timed round. Finalists present their work to a judging panel, with the top three teams winning prize money and all participants receiving certificates. Prize: Rs. 1500 shared between the top 3 teams. SPOC: Shradha Singh – 9151189268.",
    fee: 49,
    day: 1,
    startTime: "13:00",
    endTime: "18:00",
    venue: "Analytics Hub",
    category: "Business",
    teamSize: "Teams of 3",
  },
  {
    id: "environment-final-truth",
    clubs: ["Environment"],
    eventName: "The Final Truth",
    tagline: "One room. One culprit. One hour.",
    description:
      "A strategy-based murder mystery simulation where teams of four act as investigators solving a corporate murder using drip-fed physical clues, forensic evidence, and a live countdown timer. Teams analyse conflicting data and evolving twists to identify the culprit, motive, and evidence, submitting a single Accusation Sheet before time runs out. Tests deductive reasoning, teamwork, and pressure-handling in a high-tension, single-classroom format. SPOC: Kaustubh Datye – 9920662415, Adrika Gupta – 9045080328.",
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
      "A solo and group singing and music competition open to vocalists and musicians alike. Bring your range, your rhythm, and your stage presence. Includes a Band Performance segment featuring a live set by the Vibe Tribe band. Prize: 1st prize – Rs. 3000 + gift/voucher/trophy; 2nd prize – Rs. 1,500 + gift/voucher/trophy (tentative, may increase). SPOC: Kirtana – 6362489659, Dawin – 9962812342, Sai Somnath Panda – 9668820704.",
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
      "A fun two-member team game where one partner listens to a Bollywood song and acts it out using a random prop, without speaking the lyrics, while the other guesses the song within a set time. Scored on guess accuracy, creativity, and team coordination — a quick, high-energy activity blending music, non-verbal communication, and teamwork. SPOC (HR): Shaumya – 8240342994, Moulik – 7386562527. SPOC (Equinoxxx): Jayesh Madale – 9021301408, Sairaj Nyk – 7387955527.",
    fee: 0,
    day: 2,
    startTime: "14:00",
    endTime: "16:00",
    venue: "Central Courtyard",
    category: "Culture",
    teamSize: "Teams of 2",
  },
  {
    id: "enactus-go-viral",
    clubs: ["Enactus"],
    eventName: "WTF - What the Flip",
    tagline: "The brief changes mid-pitch.",
    description:
      "A fast-paced marketing simulation where teams build a campaign around a random brand, audience, platform, and budget — then get hit with surprise Plot Twist cards forcing rapid adaptation: budget cuts, audience shifts, controversy management. Round two has them create real viral content — reels, memes, skits — under a second twist, judged by live audience voting. Finalists face one last twist before pitching why their campaign deserves to go viral. Prize: Winner gets Rs. 1200. SPOC: Prithvi – 7202964189, Keya – 9967709879.",
    fee: 0,
    day: 1,
    startTime: "12:00",
    endTime: "18:00",
    venue: "Media Studio",
    category: "Business",
    teamSize: "Teams of 4",
  },
  {
    id: "zalent-icon",
    clubs: ["Zalent"],
    eventName: "Zalent Icon: Battle of the Brand Ambassadors",
    tagline: "Sell yourself. Then sell anything.",
    description:
      "An individual public speaking and improv competition where contestants pitch themselves as a brand, sell a random absurd product on the spot, then face a live press conference with genuine, audience, and one planted absurd question. Judged on composure, wit, and brand consistency, with a live Crowd Reaction Meter adding real-time audience scoring. A low-barrier, highly shareable format built to test real branding and communication skills. Prize: Winner receives a gift hamper. SPOC: Aadi – 7011196192, Yash – 6367936637, Milind – 8286913020.",
    fee: 0,
    day: 1,
    startTime: "16:00",
    endTime: "20:00",
    venue: "Brand Arena",
    category: "Business",
    teamSize: "Solo",
  },
  {
    id: "evac-fashion-show",
    clubs: ["EVAC"],
    eventName: "Fashion Show",
    tagline: "Two days. Every runway.",
    description:
      "A two-day fashion event opening with an Inter-College Fashion Competition drawing teams from across Mumbai, followed by an Intra-University Fashion Competition for in-house student talent, and a Teachers' Fashion Walk celebrating faculty. The event closes with a Felicitation Ceremony honouring standout performances across all segments. Prize: Winner receives a gift hamper. SPOC: Joanna – 8008688755, Yashi – 9004108928.",
    fee: 0,
    day: 2,
    startTime: "19:00",
    endTime: "21:00",
    venue: "Festival Grounds",
    category: "Culture",
    teamSize: "Teams of 4",
  },
  {
    id: "robotics-gameforge",
    clubs: ["Robotics"],
    eventName: "GameForge",
    tagline: "Fewer prompts. Better game.",
    description:
      "A 3-hour AI-powered game development competition where teams of 3-5 build a playable game around a surprise theme using tools like ChatGPT, Cursor, and GitHub Copilot. Judged on creativity, gameplay, functionality, and — most importantly — effective prompt engineering, rewarding teams who achieve strong results with fewer, well-structured prompts. Wraps up with live judging, winner announcement, and prize distribution. Prize: Winner receives a mystery box. SPOC: Dhariya Jesani – 9724327011, Daksh Sonar – 8669605188.",
    fee: 0,
    day: 1,
    startTime: "14:00",
    endTime: "18:00",
    venue: "Robotics Lab",
    category: "Tech",
    teamSize: "Teams of 3-5",
  },
  {
    id: "metamorphosis-naach-le-yaar",
    clubs: ["Metamorphosis"],
    eventName: "Naach Le Yaar",
    tagline: "You're on the guest list.",
    description:
      "An immersive Indian wedding-themed experience where participants become wedding guests, exploring attractions like a regional sweet tasting, wedding photo booth, mehendi station, and interactive wedding characters. Includes Individual and Couple packages with props, sweets, and instant photo keepsakes, closing with an open dance celebration. Designed to blend tradition, culture, and community engagement into a memorable Rush4Rush experience. Prize: Winner receives gift hampers. SPOC: Tisha Panda – 8369146342, Panika Nawale – 9307498455.",
    fee: 0,
    day: 1,
    startTime: "14:00",
    endTime: "18:00",
    venue: "Open Stage",
    category: "Culture",
    teamSize: "Teams of 4",
  },
];

export default clubEvents;