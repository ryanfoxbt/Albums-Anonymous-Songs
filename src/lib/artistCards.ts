// Baked-in trading cards for the parody artists — "Permanent Records
// All-Stars, Series 1" (12/12). Card art lives in /public/cards.
//
// This is a bit — a Pokémon-style stat block reskinned so it's its own
// thing: custom stat names, "STYLE" instead of type, "TRACKS" instead of
// attacks, a "HYPE" number instead of damage.
//
// These are the DEFAULTS. Admin edits are stored per-slug in the DB and
// merged on top by src/lib/artistCardStore.ts. This file stays prisma-free
// so the card component (a client component) can import the types.

export type CardTrack = {
  /** STYLE pips it costs to use, e.g. "🍑" or "🍑🍑". */
  cost: string;
  name: string;
  text: string;
  /** The big number on the right. Usually digits; can be "10×". */
  hype: string;
};

export type ArtistCard = {
  slug: string;
  name: string;
  /** Small line under the name. */
  title: string;
  /** Path under /public. */
  image: string;
  imageAlt: string;
  style: { icon: string; label: string };
  /** The joke primary stat — its own label per card. */
  stat: { label: string; value: string };
  tracks: CardTrack[];
  bombsAt: string;
  shrugsOff: string;
  exitCost: string;
  flavor: string;
  /** Card number within the series, e.g. "001". */
  number: string;
  /** 1–3 — drives the star rating / holo intensity. */
  rarity: 1 | 2 | 3;
  /** Card theming, pulled from the artwork. */
  accent: string;
  /** Ink color that reads on `accent`. */
  accentInk: string;
};

export const CARD_SERIES = {
  name: "Permanent Records All-Stars",
  edition: "Series 1",
  total: 12,
};

const CARDS: ArtistCard[] = [
  {
    slug: "kall-of-booty",
    name: "Kall of Booty",
    title: "Over-the-Hill Domestic Rapper",
    image: "/cards/kall-of-booty.png",
    imageAlt:
      "Line-drawing of Kall of Booty mid-squat in a backwards cap and gold chains, holding a microphone",
    style: { icon: "🍑", label: "Booty" },
    stat: { label: "Clout", value: "40" },
    tracks: [
      {
        cost: "🍑",
        name: "Costco Sample Run",
        text: "Convert one (1) hot dog into a free Coca-Cola. Restore 10 Clout if a friendly old folk is within earshot.",
        hype: "20",
      },
      {
        cost: "🍑🍑",
        name: "Squat & Deliver",
        text: "Drop into a full parking-lot squat. Every opponent is now downwind, and nobody can smoke in here.",
        hype: "60",
      },
    ],
    bombsAt: "🧾 The Economy ×2",
    shrugsOff: "🚼 Toddler Tantrums −20",
    exitCost: "🍑 🍑 🍑",
    flavor:
      "Raps about colonoscopies between school pickups. Still in Costco. Grocery list got lost though.",
    number: "001",
    rarity: 3,
    accent: "#E0A82E",
    accentInk: "#2a2000",
  },
  {
    slug: "smellevator",
    name: "Smellevator",
    title: "Easy Listening, Ninth Floor",
    image: "/cards/smellevator.png",
    imageAlt:
      "Cartoon of a green figure stuck between elevator doors surrounded by fart clouds, under a red bubble-letter SMELLEVATOR logo",
    style: { icon: "💨", label: "Stank" },
    stat: { label: "Air Quality", value: "13" },
    tracks: [
      {
        cost: "💨",
        name: "Silent Violence",
        text: "Deploy a cupped-hand toot grenade. Cannot miss while the doors are closed.",
        hype: "40",
      },
      {
        cost: "💨💨",
        name: "Blame Dolores",
        text: "Redirect all incoming damage to a nearby retiree who forgot to pack her cheese pills.",
        hype: "20",
      },
    ],
    bombsAt: "🚪 An Open Window ×2",
    shrugsOff: "😳 Eye Contact −10",
    exitCost: "🛗 wait for the next car",
    flavor:
      "Easy listening for people stuck between floors. I'm sorry that this box is so smelly.",
    number: "002",
    rarity: 2,
    accent: "#7E9022",
    accentInk: "#16200a",
  },
  {
    slug: "cuntreeboi",
    name: "Cuntreeboi",
    title: "Zero-Emission Cowboy",
    image: "/cards/cuntreeboi.png",
    imageAlt:
      "Illustration of Cuntreeboi tipping his hat, seated on a blue donkey with a guitar, a huge US flag behind him in the desert",
    style: { icon: "🤠", label: "Twang" },
    stat: { label: "Highway MPG", value: "54" },
    tracks: [
      {
        cost: "🤠",
        name: "Zero-Emission Two-Step",
        text: "Trade the lifted truck for a Prius. Opponent discards every Cool token. You may not look as cool.",
        hype: "30",
      },
      {
        cost: "🤠🤠",
        name: "Fold the Seats Down",
        text: "There's enough room in the back if you really try. Love for the Prius: on par with love for Jesus.",
        hype: "50",
      },
    ],
    bombsAt: "⛽ Nothing — gas prices do 0",
    shrugsOff: "🛻 Peer Pressure −30",
    exitCost: "🫏 the donkey sets the pace",
    flavor:
      "Them country girls like a man in a truck. The plums are gettin' blue, but the mission is zero emission.",
    number: "003",
    rarity: 2,
    accent: "#CE7B35",
    accentInk: "#241202",
  },
  {
    slug: "gasoline-dion",
    name: "Gasoline Dion",
    title: "Power Balladeer of the Wasteland",
    image: "/cards/gasoline-dion.png",
    imageAlt:
      "Comic-book illustration of Gasoline Dion belting into a mic in a red gown atop a rusty, spiked semi truck in a fiery wasteland",
    style: { icon: "🔥", label: "Ballad" },
    stat: { label: "Lung Capacity", value: "90" },
    tracks: [
      {
        cost: "🔥",
        name: "The Sound of Breaking Wind",
        text: "A solemn folk key change, performed rear-first. Nearby crowds sob and weep.",
        hype: "40",
      },
      {
        cost: "🔥🔥",
        name: "Full-Throttle Key Change",
        text: "Belt the last chorus from the roof of a burning rig. Costs you 20 of your own Lung Capacity.",
        hype: "80",
      },
    ],
    bombsAt: "🎧 Subtlety ×2",
    shrugsOff: "🌊 “My Heart Will Go On” −20",
    exitCost: "🔥 🔥 the truck is still on fire",
    flavor: "Every note delivered from a moving vehicle. Hello darkness, rear end.",
    number: "004",
    rarity: 3,
    accent: "#DD5330",
    accentInk: "#2a0a02",
  },
  {
    slug: "nasally-yours",
    name: "Nasally Yours",
    title: "Constantly Being Broken Up With",
    image: "/cards/nasally-yours.png",
    imageAlt:
      "Photo of a hooded emo kid with swept bangs crying into a tissue in a graveyard, under a dripping NASALLY YOURS logo",
    style: { icon: "😭", label: "Feelings" },
    stat: { label: "Tears", value: "999" },
    tracks: [
      {
        cost: "😭",
        name: "Strongly Worded Text",
        text: "Send it to you, and also your friends. It is going to make the group chat weird.",
        hype: "20",
      },
      {
        cost: "😭😭",
        name: "Constant State of Being Broken",
        text: "HYPE equals 10 × the number of girls who dumped him for cosmetic reasons (guyliner, skinny jeans, lip-ring canker sore).",
        hype: "10×",
      },
    ],
    bombsAt: "💧 Canker Sores ×2",
    shrugsOff: "🖤 Being Perceived −10",
    exitCost: "🧻 he needs the tissue",
    flavor:
      "So emotional. About everything. Dashboard Confessional is so well-spoken.",
    number: "005",
    rarity: 2,
    accent: "#6B7280",
    accentInk: "#f4f4f5",
  },
  {
    slug: "can-t",
    name: "Can't",
    title: "Krautrock, But Constipated",
    image: "/cards/can-t.svg",
    imageAlt:
      "Cartoon of a tin can with a deadpan, sweating face slumped next to a toilet, a peanut with a no symbol floating nearby",
    style: { icon: "🚽", label: "Blockage" },
    stat: { label: "Regularity", value: "0" },
    tracks: [
      {
        cost: "🥜",
        name: "Plop-or-tunity",
        text: "Missed it this morning. Nothing is happening now, and it may not happen in public — money's tight.",
        hype: "10",
      },
      {
        cost: "🚽🚽",
        name: "Home Court Advantage",
        text: "Refuse to use any restroom you did not personally train your butt in. Skip your next turn.",
        hype: "30",
      },
    ],
    bombsAt: "🥜 Peanuts (also a legume, somehow) ×2",
    shrugsOff: "🎸 Acoustic Guitar Strumming −20",
    exitCost: "🚽 find one you trust first",
    flavor: "Sometimes peanuts help me poop, although I'm allergic. Rock.",
    number: "006",
    rarity: 2,
    accent: "#8A6D3B",
    accentInk: "#1c1508",
  },
  {
    slug: "elvis-causesmello",
    name: "Elvis CauseSmello",
    title: "New Wave, Low Self-Esteem",
    image: "/cards/elvis-causesmello.svg",
    imageAlt:
      "Cartoon of a nervous man in thick black glasses and a skinny tie, a tiny yappy dog between him and a heart, green stink wisps",
    style: { icon: "🔎", label: "Insecurity" },
    stat: { label: "Confidence", value: "−2" },
    tracks: [
      {
        cost: "🔎",
        name: "Freeze It Off",
        text: "Get the embarrassing thing removed at the doctor. Restore 20 Confidence and buy a Smirnoff.",
        hype: "20",
      },
      {
        cost: "🐶🐶",
        name: "Slow Down the Smushing",
        text: "Deploy a small annoying dog that barks and gets in between. Nobody smushes this turn.",
        hype: "40",
      },
    ],
    bombsAt: "🙄 A Rolled Eye ×2",
    shrugsOff: "😎 Beach Girls −10",
    exitCost: "🐶 the tiny dog won't move",
    flavor:
      "Looked at those beach girls, then looked at my moley sack. Went to the doctor.",
    number: "007",
    rarity: 2,
    accent: "#5B8C3E",
    accentInk: "#12200a",
  },
  {
    slug: "lame-impala",
    name: "Lame Impala",
    title: "Psych-Pop Grooming Crisis",
    image: "/cards/lame-impala.svg",
    imageAlt:
      "Psychedelic-swirl cartoon of a man in a bathrobe with bed-head and a third eye, holding a razor and a juice box, looking nervous",
    style: { icon: "🪒", label: "Falsetto" },
    stat: { label: "Third Eye", value: "1" },
    tracks: [
      {
        cost: "🪒",
        name: "How Do You Shave Your Balls?",
        text: "Ask it out loud, in harmony. Every male opponent freezes, afraid to Google the answer.",
        hype: "30",
      },
      {
        cost: "🪒🪒",
        name: "Water in the Hole",
        text: "A very thorough rinse. Then don't get back in the shower, folks.",
        hype: "50",
      },
    ],
    bombsAt: "👶 The Kids Need Stuff ×2",
    shrugsOff: "💿 Sony Owning Your Catalogue −20",
    exitCost: "🪒 🧴 still scrubbing that thing",
    flavor:
      "I just want to make music but the kids need stuff. I'm sitting at home wiping butts.",
    number: "008",
    rarity: 3,
    accent: "#B95CA8",
    accentInk: "#2a0f24",
  },
  {
    slug: "linkedin-park",
    name: "LinkedIn Park",
    title: "Nu-Metal, Open To Work",
    image: "/cards/linkedin-park.svg",
    imageAlt:
      "LinkedIn-blue cartoon of a screaming nu-metal singer in a suit jacket over a band tee, ringed by a green #OpenToWork banner",
    style: { icon: "💼", label: "Screaming" },
    stat: { label: "Connections", value: "500+" },
    tracks: [
      {
        cost: "💼",
        name: "I Could Build Your Website",
        text: "With Claude Code. And query your database, and do the email marketing. Opponent's mind explodes.",
        hype: "40",
      },
      {
        cost: "💼💼",
        name: "Open For Work!",
        text: "Scream your entire skills list into one breakdown. The green banner activates.",
        hype: "60",
      },
    ],
    bombsAt: "📉 A Hiring Freeze ×2",
    shrugsOff: "🔕 Recruiter Ghosting −10",
    exitCost: "💼 updating the headline again",
    flavor: "A Q&A engineer who does email marketing. Open for work!",
    number: "009",
    rarity: 2,
    accent: "#0A66C2",
    accentInk: "#e8f2fc",
  },
  {
    slug: "papa-john-windy",
    name: "Papa John Windy",
    title: "Indie Folk Health Nut",
    image: "/cards/papa-john-windy.svg",
    imageAlt:
      "Warm-toned cartoon of a serene bearded folk singer with a flower headband delicately blotting a pizza slice with a napkin",
    style: { icon: "🍕", label: "Wellness" },
    stat: { label: "Cholesterol", value: "OK" },
    tracks: [
      {
        cost: "🍕",
        name: "Dab the Grease",
        text: "Blot every slice with a napkin. You will never grow to be this strong and strappin' otherwise.",
        hype: "20",
      },
      {
        cost: "🍕🍕",
        name: "I'm Not One to Judge",
        text: "Then judge, gently, in verse. Opponent re-examines the crispy edges of their pepperoni.",
        hype: "30",
      },
    ],
    bombsAt: "🧀 An Un-Blotted Slice ×2",
    shrugsOff: "🙅 Other People's Choices −10",
    exitCost: "🧻 needs a fresh napkin",
    flavor:
      "You'll never get this strappin' without dabbin' the grease off your pizza with a napkin.",
    number: "010",
    rarity: 1,
    accent: "#B7791F",
    accentInk: "#241505",
  },
  {
    slug: "the-random-ass-all-stars",
    name: "The Random Ass All Stars",
    title: "A Benefit-Single Supergroup",
    image: "/cards/the-random-ass-all-stars.svg",
    imageAlt:
      "Charity-single cartoon: a mismatched choir of silhouettes around one mic, a short-spined raccoon holding a candle up front, a monkey swinging behind",
    style: { icon: "🕯️", label: "Charity" },
    stat: { label: "Members", value: "?" },
    tracks: [
      {
        cost: "🕯️",
        name: "Save the World for Jimothy",
        text: "Assemble a mismatched choir around one mic for a short-spined wild raccoon. World powers must calm the F down.",
        hype: "30",
      },
      {
        cost: "🕯️🍌",
        name: "Wake Up the Monkeys",
        text: "Give one a banana, get funky, finish the tourists' drinks.",
        hype: "20",
      },
    ],
    bombsAt: "🎯 A Coherent Concept ×2",
    shrugsOff: "🏈 Being a Seahawks Fan −10",
    exitCost: "🦝 waiting on Jimothy",
    flavor:
      "Skulk a little, hop a little, limp a little too. Jimothy, the world loves you.",
    number: "011",
    rarity: 1,
    accent: "#6D5BB5",
    accentInk: "#f2eefc",
  },
  {
    slug: "the-weekdays",
    name: "The Weekdays",
    title: "R&B, Terminally Online",
    image: "/cards/the-weekdays.svg",
    imageAlt:
      "Neon-purple cartoon of a singer with tall hair, face lit by a phone glued to both hands, a glass of milk with a no symbol",
    style: { icon: "📱", label: "Doomscroll" },
    stat: { label: "Screen Time", value: "23h" },
    tracks: [
      {
        cost: "📱",
        name: "All Day Phone",
        text: "Wake up phone, coffee phone, pooping phone, mowing the lawn phone. Opponent checks their notifications.",
        hype: "30",
      },
      {
        cost: "📱🧀",
        name: "Machine Gun Fart Kelly",
        text: "Test the lactose theory again, tonight, without thinking. The room's a-stinkin'.",
        hype: "40",
      },
    ],
    bombsAt: "🥛 A Tall Glass of Milk ×2",
    shrugsOff: "☎️ Someone Wanting to Talk −10",
    exitCost: "📱 one more scroll",
    flavor:
      "Text my girl I love her but I hate her. Talking to my therapist phoooone.",
    number: "012",
    rarity: 2,
    accent: "#7C3AED",
    accentInk: "#f1eaff",
  },
];

const BY_SLUG = new Map(CARDS.map((card) => [card.slug, card]));

/** The baked-in card for `slug`, before any admin override. */
export function getDefaultCard(slug: string): ArtistCard | undefined {
  return BY_SLUG.get(slug);
}

/** Every baked-in card, before any admin override. */
export function getDefaultCards(): ArtistCard[] {
  return CARDS;
}

/** Fields an admin can edit; `slug` and `number` are fixed. */
export type ArtistCardPatch = Partial<Omit<ArtistCard, "slug" | "number" | "image">>;
