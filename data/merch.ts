export type MerchAudience = "UG" | "PG";

export type MerchProduct = {
  id: string;
  name: string;
  audience: MerchAudience;
  price: number;
  currency: "INR";
  sizes: string[];
  description: string;
  image: string;
};

export const merch: MerchProduct[] = [
  {
    id: "r4r-tshirt-ug",
    name: "R4R Undergrad Tee",
    audience: "UG",
    price: 378,
    currency: "INR",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "The official Rush4Rush undergrad tee — black on neon pink. Built for the front row, the afterparty, and every memory in between.",
    image: "/merch/r4r-tshirt-ug.png",
  },
  {
    id: "r4r-tshirt-pg",
    name: "R4R Postgrad Tee",
    audience: "PG",
    price: 378,
    currency: "INR",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "The official Rush4Rush postgrad tee — charcoal on electric cyan. A cleaner cut for the ones running the show.",
    image: "/merch/r4r-tshirt-pg.png",
  },
];

export function getMerchByAudience(audience: MerchAudience): MerchProduct {
  return merch.find((item) => item.audience === audience) ?? merch[0];
}

export default merch;
