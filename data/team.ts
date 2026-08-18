export type TeamMember = {
  name: string;
  role: string;
  photo: string;
  linkedin: string;
  github: string;
};

export const techTeam: TeamMember[] = [
  {
    name: "Aarav Mehta",
    role: "Tech Lead",
    photo: "/team/aarav-mehta.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Ishita Rao",
    role: "Frontend Engineer",
    photo: "/team/ishita-rao.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Kabir Shah",
    role: "Backend Engineer",
    photo: "/team/kabir-shah.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
  {
    name: "Mira Kapoor",
    role: "Product Designer",
    photo: "/team/mira-kapoor.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
  },
];

export default techTeam;
