export type Department = {
  name: string;
  leaders: string[];
  members: string[];
};

/** Photos live in /public/team — key must match the person's name exactly. */
export const photos: Record<string, string> = {
  "Amrita Mathews": "/team/Amrita_Mathews.jpg",
  "Dakshi Gala": "/team/Dakshi_Gala.jpg",
  "Vratika Jain": "/team/Vratika_Jain.jpg",
  "Yashita Dhanjani": "/team/Yashika.jpg",
  "Satvik Kochar": "/team/Satvik_Kochar.jpeg",
  "Raman Singh": "/team/Raman_Singh.jpeg",
  "Parthiv Raj": "/team/Parthiv_Raj.jpg",
  "Mohi Jain": "/team/Mohi_Jain.jpg",
  "Bhavana Ajith": "/team/Bhavana_Ajith.jpg",
  "Anchal Pandey": "/team/Anchal_Pandey.jpg",
  "Adarsh Nema": "/team/Adarsh.jpg",
  "Pearl Choudhary": "/team/Pearl_new.png",
  "Gun Gupta": "/team/Gun_Gupta.png",
  "Abhishek Kumar": "/team/Vivan.jpg",
  Sarthak: "/team/Sarthak.jpg",
  "Yash Pardeshi": "/team/Yash_Pardeshi.jpg",
  "Vallab Dixit": "/team/Vallabh_Dixit.png",
  "Ratnadeep Patil": "/team/Ratnadeep_Patil.webp",
  Mandvi: "/team/Mandvi_Singh_Baghel.jpg",
  "Mahi Vashisht": "/team/Mahi_Vashisht.jpg",
  "Harshita Kumar": "/team/Harshita_Kumar.jpg",
};

export const deanSom: { role: string; name: string }[] = [
  { role: "Advisor to the event", name: "Harshita Kumar" },
];

export const higherAuthority: { role: string; name: string }[] = [
  { role: "R4R Annual Event Head", name: "Amrita Mathews" },
];

export const coreTeam: { role: string; name: string }[] = [
  { role: "Head of R4R", name: "Yash Pardeshi" },
  { role: "Co-Head of R4R", name: "Adarsh Nema" },
  { role: "General Secretary", name: "Bhavana Ajith" },
  { name: "Pearl Choudhary", role: "Events Head" },
];

export const departments: Department[] = [
  { name: "Administration", leaders: ["Bhavana Ajith"], members: ["Antas Trivedi", "Vanshika Chaudhary"] },
  { name: "Finance", leaders: ["Raman Singh"], members: ["Bhavya Jain", "Dhanashri Shinde"] },
  {
    name: "Marketing",
    leaders: ["Dakshi Gala", "Satvik Kochar"],
    members: ["Harshit Chandaliya", "Darpan Jaroli", "Yakshi Goyal", "Sonal Singh", "Aayush Mohanka", "Hritiza Raj Bandral", "Bipasa Roy", "Geetanjali Tiwari", "Atharv Sinha"],
  },
  {
    name: "Decor",
    leaders: ["Mahi Vashisht", "Vratika Jain"],
    members: ["Isha Verma", "Anjali Kumari", "Vansh Kohli", "Ananya Neogi", "Dimpi Khatri", "Khushi Pareek", "Riyaz Mukharjee", "Swarangi Pawar", "Adrika Gupta", "Swati Pandey"],
  },
  { name: "Hospitality", leaders: ["Mandvi Singh Baghel"], members: ["Kumari Sonali", "Ridhhi Bansal", "Anshika Agrawal"] },
  
  {
    name: "DM",
    leaders: ["Adarsh Nema", "Ratnadeep Patil"],
    members: ["Aman Pawar", "Vaaman Dubey", "Suhas Deshpande", "Shradha Singh", "Sarvesh Bhoir", "Gayatri Hanumante", "Suhani Bairagi", "Kapil Basera", "Mitali Joshi", "Sakshi Sharma", "Pragati Agrawal", "Ishita Agrawal", "Purvi Kothari", "Mahima Sachdeva"],
  },
  {
    name: "Operations",
    leaders: ["Yash Pardeshi", "Vallab Dixit"],
    members: ["Yash Sharma", "Ali Abbas Naqvi", "Akash Tiwari", "Aryan Dhanak", "Digansh Upadhyay", "Gaurav Dubey", "Tanishq Vishwakarma", "Shreyans Dhulap", "Sriram Seelam", "Sanchita Bidka", "Mridu Joshi", "Srishti Gupta", "Ashmita Agastas", "Anushka Jain", "Lakshitaa Jha", "Kushagri Gour", "Sakshi Panwar", "Vidhi Giradkar", "Sahaj Jain"],
  },
  {
    name: "Sponsorship",
    leaders: ["Parthiv Raj", "Sarthak"],
    members: ["Jas Khoda", "Shauraj Indurkar", "Kumari Sonali", "Aditi Gwarnani", "Raj Tiwari", "Gauri Kajla", "Animesh Mehra", "Tanishka Hemlani", "Anshika Agrawal", "Riddhi Bansal", "Tanisha Kadam", "Mansi Maheshwari", "Abhishek Yadav", "Isha Thakkar", "Kadir Khan", "Siddhu", "Ayushi"],
  },
  {
    name: "Disciplinary",
    leaders: ["Abhishek Kumar", "Gun Gupta"],
    members: ["Ashmita Agarwal", "Pradyot Harkhani", "Akaash Badi", "Anushka Ghosh", "Ananya Soni", "Pushkar Pathak", "Ravi Ranjan", "Priganshi Gandhi", "Saniga Sawant", "Dhananjay Bakshi", "Jalish", "Anushka Sharma", "Naman Ruhela", "Diby Khatri", "Abhishek Yadav", "Darpan", "Sriram"],
  },
  {
    name: "FlashMob",
    leaders: [],
    members: ["Pearl Choudhary","Mandvi Singh Baghel","Mohi Jain"],
  },
  { name: "Event", leaders: ["Pearl Choudhary"], members: ["Yash Goutam","Harshit Panjwani","Mahak Dhamecha"] },

  { name: "Anchoring", leaders: ["Yashita Dhanjani"], members: [""] },

];