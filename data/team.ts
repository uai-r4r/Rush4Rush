export type TeamMember = {
  name: string;
  role: string;
  photo: string;
  linkedin: string;
  github: string;
};

export const techTeam: TeamMember[] = [
  {
    name: "Divyansh Routray",
    role: "Tech Lead",
    photo: "/team/aarav-mehta.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Aryaman Singh",
    role: "Frontend Engineer & UI/UX Designer",
    photo: "/team/ishita-rao.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Pushpak Sarode",
    role: "Backend Engineer",
    photo: "/team/kabir-shah.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Hiren Jurani",
    role: "Product Designer",
    photo: "/team/mira-kapoor.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
];

export default techTeam;
