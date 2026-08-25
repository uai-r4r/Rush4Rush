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
    photo: "/team/divyansh.jpg",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/divyanshroutray8d13-wq",
  },
  {
    name: "Aryaman Singh",
    role: "Frontend Engineer & UI/UX Designer",
    photo: "/team/aryaman2.png",
    linkedin: "https://www.linkedin.com/in/aryaman-singh-0b8807365/",
    github: "https://github.com/AryamanSingh1106",
  },
  {  
    name: "Pushpak Sarode",
    role: "Backend Engineer",
    photo: "/team/pushpak.jpg",
    linkedin: "https://www.linkedin.com/in/pushpak-sarode-8a181936a ",
    github: " https://github.com/PUSHPAKSARODE07",
  },
  {
    name: "Hiren Jhurani",
    role: "Product Designer",
    photo: "/team/hiren.jpg",
    linkedin: "https://www.linkedin.com/in/hiren-jhurani-82457a3b5",
    github: "https://github.com/Hiren807",
  },
];

export default techTeam;
