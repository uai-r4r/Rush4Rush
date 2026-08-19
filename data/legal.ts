/**
 * Central config for all legal / policy pages.
 *
 * ⚠️  FILL EVERY VALUE MARKED "FILL_ME" BEFORE SUBMITTING RAZORPAY KYC.
 *     Razorpay reviewers manually open these pages. Placeholder text,
 *     a missing physical address, or an unmonitored email is the #1
 *     reason KYC gets sent back.
 */

export const LEGAL = {
    /** Public-facing name of the event/brand */
    brand: "Rush4Rush",
    brandShort: "R4R",
  
    /** The legal entity that actually receives the money.
     *  This MUST match the entity name on your Razorpay account. */
    entity: "School of AI and future technologies, Universal AI University",
  
    /** Full postal address. Razorpay requires a real, verifiable address. */
    address: {
      line1: "Universal AI University",
      line2: "Kushiwali, PO Gaurkamath, Vadap",
      city: "Karjat",
      state: "Maharashtra",
      pincode: "410201",
      country: "India",
    },
  
    /** Must be a monitored inbox. Reviewers sometimes send a test mail. */
    email: "Rush4Rush@universalai.in",
  
    /** Must be a real, reachable number in +91 XXXXX XXXXX format. */
    phone: "+91-9665272538 or +91-9116945845",
  
    /** Support hours shown on Contact Us. */
    supportHours: "Monday to Saturday, 10:00 AM – 6:00 PM IST",
  
    /** Grievance Officer — required under the DPDP Act, 2023 and the
     *  IT (Intermediary Guidelines) Rules. Can be the same person as
     *  the main contact, but must be a named individual. */
    grievanceOfficer: {
      name: "Yash Pardeshi",
      designation: "Rush4Rush Head",
      email: "Rush4Rush@universalai.in",
    },
  
    /** Your live domain, no trailing slash. */
    website: "https://rush4rush.com",
  
    /** Jurisdiction for disputes. Karjat falls under Raigad district. */
    jurisdiction: "Raigad, Maharashtra",
  
    /** Update this whenever you edit any policy page. */
    lastUpdated: "19 August 2026",
  
    /** Pricing — keep in sync with your actual checkout logic. */
    pricing: {
        /** Entry pass for visitors from outside the university. */
        entryPass: "₹100",
        /** Discounted entry pass for verified university students. */
        studentEntryPass: "₹50",
        studentDomain: "@universalai.in",
      },
  
    /** Working days for a refund to land back on the source method. */
    refundWindowDays: "5–7 working days",
  
    /** Days a user has to raise a payment dispute with you. */
    disputeWindowDays: 7,
  } as const;
  
  export const ADDRESS_LINES = [
    LEGAL.address.line1,
    LEGAL.address.line2,
    `${LEGAL.address.city}, ${LEGAL.address.state} ${LEGAL.address.pincode}`,
    LEGAL.address.country,
  ];
  