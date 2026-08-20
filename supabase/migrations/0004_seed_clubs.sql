-- R4R 2026 — seed clubs and events, generated from data/clubs.ts
-- Fees are all 0 placeholders in clubs.ts. Update fee_inr here (or in the
-- dashboard) once real numbers land — the DB is the source of truth now.

insert into public.clubs (id, name) values
  ('rotaract', 'Rotaract'),
  ('sports-club', 'Sports Club'),
  ('matchbox', 'Matchbox'),
  ('alumni', 'Alumni'),
  ('arts-and-culture', 'Arts and Culture'),
  ('elc', 'ELC'),
  ('finx', 'FINX'),
  ('uic', 'UIC'),
  ('ethics-and-csr', 'Ethics & CSR'),
  ('dramatics', 'Dramatics'),
  ('analytica', 'Analytica'),
  ('environment', 'Environment'),
  ('vibe-tribe', 'Vibe Tribe'),
  ('equinoxxx', 'Equinoxxx'),
  ('techops', 'Techops'),
  ('enactus', 'Enactus'),
  ('hr', 'HR'),
  ('zalent', 'Zalent'),
  ('evac', 'EVAC'),
  ('robotics', 'Robotics'),
  ('metamorphosis', 'Metamorphosis')
on conflict (id) do nothing;

insert into public.events (id, club_id, name, tagline, description, fee_inr, day, start_time, end_time, venue, category, team_size) values
  ('rotaract-traitors', 'rotaract', 'Traitors', 'Trust no one. Read every move.', 'A high-stakes social deduction game where alliances shift and secrets matter. Bring your instincts, your poker face, and your sharpest strategy.', 0, 1, '10:00', '12:00', 'Main Auditorium', 'Social', 'Teams of 4'),
  ('sports-side-futsal', 'sports-club', 'Side Futsal Tournament', 'Small pitch. Big energy.', 'Fast feet and faster decisions meet in this compact futsal showdown. Gather your squad and battle through a high-intensity tournament.', 0, 1, '10:00', '13:00', 'Sports Arena', 'Sports', 'Teams of 4'),
  ('matchbox-project-x', 'matchbox', 'Project X', 'Make the night legendary.', 'A creative challenge built around bold ideas, quick collaboration, and a little controlled chaos. Expect surprises at every turn.', 0, 1, '12:00', '14:00', 'Innovation Lab', 'Social', 'Teams of 4'),
  ('alumni-business-quiz', 'alumni', 'Business Quiz', 'Know the game behind the game.', 'Test your business IQ across brands, markets, founders, and the decisions that shape industries. Only the quickest minds make the final round.', 0, 1, '12:00', '14:00', 'Seminar Hall A', 'Business', 'Teams of 4'),
  ('arts-uai-got-latent', 'arts-and-culture', 'UAI Got Latent', 'The stage is yours to disrupt.', 'A talent showcase for the unexpected, the unfiltered, and the unforgettable. Step into the spotlight and let your hidden talent take over.', 0, 1, '14:00', '16:00', 'Open Stage', 'Culture', 'Solo'),
  ('arts-naach-baraati', 'arts-and-culture', 'Naach Baraati Naach', 'Dance like the baraat is watching.', 'Turn celebration into choreography in this high-colour dance battle. Bring your crew, your signature moves, and your loudest energy.', 0, 1, '16:00', '18:00', 'Central Courtyard', 'Culture', 'Teams of 4'),
  ('elc-campus-roadies', 'elc', 'Campus Roadies', 'Courage, chaos, campus.', 'A series of mental, physical, and social challenges designed to test how far you can go. Adapt quickly and never lose your team.', 0, 1, '14:00', '17:00', 'Activity Zone', 'Social', 'Teams of 4'),
  ('finx-venture-league', 'finx', 'Venture League', 'Pitch big. Think bigger.', 'Build a venture from the ground up and prove your idea under pressure. Strategy, storytelling, and commercial instinct decide the winners.', 0, 1, '16:00', '18:00', 'Boardroom', 'Business', 'Teams of 4'),
  ('uic-boardroom-battle', 'uic', 'Boardroom Battle', 'Every decision has a price.', 'Step into an executive simulation where every call changes the game. Navigate competition, risk, and opportunity to take the top seat.', 0, 1, '18:00', '20:00', 'Executive Hall', 'Business', 'Teams of 4'),
  ('ethics-treasure-hunt', 'ethics-and-csr', 'Treasure Hunt', 'Follow the clues. Find the signal.', 'Decode clues, solve puzzles, and explore the campus through a challenge with a conscience. Collaboration is your most valuable compass.', 0, 1, '18:00', '20:00', 'Campus-wide', 'Social', 'Teams of 4'),
  ('dramatics-level-up', 'dramatics', 'Level Up', 'Improvise beyond the script.', 'A theatre challenge that rewards instinct, presence, and fearless performance. Take the prompt, own the scene, and level up together.', 0, 2, '10:00', '12:00', 'Black Box Theatre', 'Culture', 'Teams of 4'),
  ('analytica-bidding-wars', 'analytica', 'Bidding Wars', 'Data is power. Budget is survival.', 'Use evidence, timing, and calculated risk to win the assets that matter. A competitive analytics game where one bad bid changes everything.', 0, 2, '10:00', '12:00', 'Analytics Hub', 'Tech', 'Teams of 4'),
  ('environment-final-truth', 'environment', 'The Final Truth', 'Question the story you inherited.', 'Uncover the facts behind complex environmental choices in a fast-paced investigation. Think critically, connect the clues, and find the final truth.', 0, 2, '12:00', '14:00', 'Seminar Hall B', 'Social', 'Teams of 4'),
  ('vibe-tribe-sa-re-ga-ma', 'vibe-tribe', 'Sa Re Ga Ma of UAI', 'Let the campus sing.', 'A musical face-off where range, rhythm, and stage presence take centre stage. Sing solo or bring a team that knows how to harmonise.', 0, 2, '12:00', '14:00', 'Main Auditorium', 'Culture', 'Solo'),
  ('vibe-tribe-band-performance', 'vibe-tribe', 'Band Performance', 'Turn the volume into a memory.', 'Live instruments, electric chemistry, and a set made for the crowd. Come for the soundcheck and stay for the full-campus singalong.', 0, 2, '18:00', '20:00', 'Festival Grounds', 'Culture', 'Teams of 4'),
  ('equinoxxx-object-beats', 'equinoxxx', 'Bollywood Object Beats', 'Anything can be an instrument.', 'Create rhythm from the everyday in a playful Bollywood-inspired beat battle. Bring your imagination and turn ordinary objects into a performance.', 0, 2, '14:00', '16:00', 'Central Courtyard', 'Culture', 'Teams of 4'),
  ('techops-level-up', 'techops', 'Level Up', 'Solve fast. Ship faster.', 'A practical tech challenge for builders who thrive under a ticking clock. Debug, collaborate, and turn the brief into something that works.', 0, 2, '14:00', '17:00', 'Computer Lab', 'Tech', 'Teams of 4'),
  ('enactus-go-viral', 'enactus', 'Go Viral: The Plot Twist', 'Make impact impossible to scroll past.', 'Build a campaign around a social idea and give it a plot twist that makes people care. Creativity meets purpose in this communications sprint.', 0, 2, '16:00', '18:00', 'Media Studio', 'Business', 'Teams of 4'),
  ('hr-object-beats', 'hr', 'Bollywood Object Beats', 'Recruit the rhythm.', 'A high-energy team challenge where performance, coordination, and a little Bollywood flair come together. Make your objects sing in sync.', 0, 1, '10:00', '12:00', 'Dance Studio', 'Culture', 'Teams of 4'),
  ('zalent-icon', 'zalent', 'Zalent Icon: Battle of the Brand Ambassadors', 'Own the brand. Become the icon.', 'Step into the shoes of a brand ambassador and sell the story with confidence. Presence, persuasion, and personality will set the icons apart.', 0, 1, '14:00', '16:00', 'Brand Arena', 'Business', 'Solo'),
  ('evac-fashion-show-day-1', 'evac', 'Fashion Show', 'Walk into the future.', 'A runway built for bold silhouettes, sharp concepts, and unforgettable entrances. Style the moment and make the whole campus look twice.', 0, 1, '18:00', '20:00', 'Festival Grounds', 'Culture', 'Teams of 4'),
  ('robotics-gameforge', 'robotics', 'GameForge', 'Build the fun from scratch.', 'Design, prototype, and play your way through a challenge where engineering meets game design. The best builds are clever, playable, and memorable.', 0, 2, '10:00', '13:00', 'Robotics Lab', 'Tech', 'Teams of 4'),
  ('metamorphosis-naach-le-yaar', 'metamorphosis', 'Naach Le Yaar', 'Find the beat in your people.', 'An open-floor dance experience celebrating friendship, freedom, and fearless movement. Come ready to learn, perform, and leave lighter than you arrived.', 0, 2, '16:00', '18:00', 'Open Stage', 'Culture', 'Teams of 4')
on conflict (id) do update set
  club_id=excluded.club_id, name=excluded.name, tagline=excluded.tagline,
  description=excluded.description, day=excluded.day,
  start_time=excluded.start_time, end_time=excluded.end_time,
  venue=excluded.venue, category=excluded.category, team_size=excluded.team_size;
