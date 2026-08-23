export type MerchSchool = "music" | "ai" | "psych";

export type MerchProduct = {
  id: string;
  name: string;
  shortName: string;
  school: MerchSchool;
  price: number;
  currency: "INR";
  sizes: string[];
  description: string;
  image: string;
};

export const merch: MerchProduct[] = [
  {
    id: "r4r-polo-music",
    name: "School of Music, Sound & Cinematics",
    shortName: "Music, Sound & Cinematics",
    school: "music",
    price: 378,
    currency: "INR",
    sizes: ["M", "L", "XL"],
    description:
      "Black polo with orange tipping, school crest on the chest and the Rush4Rush seal across the back.",
    image: "/merch/r4r-polo-music.png",
  },
  {
    id: "r4r-polo-ai",
    name: "School of AI & Future Technology",
    shortName: "AI & Future Technology",
    school: "ai",
    price: 378,
    currency: "INR",
    sizes: ["M", "L", "XL"],
    description:
      "Orange polo with the university crest on the chest and the Rush4Rush seal across the back.",
    image: "/merch/r4r-polo-ai.png",
  },
  {
    id: "r4r-polo-psych",
    name: "School of Psychology & Management",
    shortName: "Psychology & Management",
    school: "psych",
    price: 378,
    currency: "INR",
    sizes: ["M", "L", "XL"],
    description:
      "Royal blue polo with the university crest on the chest and the Rush4Rush seal across the back.",
    image: "/merch/r4r-polo-psych.png",
  },
];

export function getMerchBySchool(school: MerchSchool): MerchProduct {
  return merch.find((item) => item.school === school) ?? merch[0];
}

export default merch;
