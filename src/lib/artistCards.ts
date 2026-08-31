// Collectible trading cards for the parody artists — "Permanent Records
// All-Stars, Series 1". Card art lives in /public/cards. Only artists with
// finished art are here; the rest of the roster is planned (12 total).
//
// This is a bit — a Pokémon-style stat block reskinned so it's its own
// thing: custom stat names, "STYLE" instead of type, "TRACKS" instead of
// attacks, a "HYPE" number instead of damage. Prisma-free so the card
// component (a client component) can import it.

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
];

const BY_SLUG = new Map(CARDS.map((card) => [card.slug, card]));

export function getArtistCard(slug: string): ArtistCard | undefined {
  return BY_SLUG.get(slug);
}

export function getAllArtistCards(): ArtistCard[] {
  return CARDS;
}
