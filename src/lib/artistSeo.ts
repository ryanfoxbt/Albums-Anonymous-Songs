// Short editorial blurbs for the parody artists, used on /artist/[slug]
// for the meta description and a visible tagline. Grounded in the songs
// and the podcast episodes they came from. Artists without an entry fall
// back to a generated description.

export type ArtistSeo = {
  /** One line — what this act is. Used as the meta description. */
  tagline: string;
  /** Real artist / franchise the name plays on, if any. */
  parodyOf?: string;
};

export const ARTIST_SEO: Record<string, ArtistSeo> = {
  "kall-of-booty": {
    tagline:
      "Kall of Booty is Albums Anonymous's over-the-hill 40-year-old domestic rapper — hip-hop songs about Costco runs, colonoscopies, couples therapy and wiping butts.",
    parodyOf: "Call of Duty",
  },
  "lame-impala": {
    tagline:
      "Lame Impala is the Albums Anonymous psych-pop act: lush, falsetto Tame Impala–style songs about manscaping, showering, and being a rockstar dad.",
    parodyOf: "Tame Impala",
  },
  smellevator: {
    tagline:
      "Smellevator is a lounge / elevator-music project whose entire catalogue is about passing gas in elevators and hotels.",
  },
  "can-t": {
    tagline:
      "Can't is a deadpan jam band — a play on krautrock group Can — making meandering songs about constipation, food allergies and public-restroom anxiety.",
    parodyOf: "Can",
  },
  "the-weekdays": {
    tagline:
      "The Weekdays is the Albums Anonymous R&B act, a riff on The Weeknd — moody, smooth songs about phone addiction and being lactose intolerant.",
    parodyOf: "The Weeknd",
  },
  "elvis-causesmello": {
    tagline:
      "Elvis CauseSmello (aka Elvis Cosmello) is the Albums Anonymous Elvis Costello parody — wiry rock songs about insecurity, dating and domestic life.",
    parodyOf: "Elvis Costello",
  },
  "gasoline-dion": {
    tagline:
      "Gasoline Dion is an Albums Anonymous balladeer — best known for the solemn Simon & Garfunkel folk parody 'Fart Garfunkel.'",
    parodyOf: "Céline Dion",
  },
  "nasally-yours": {
    tagline:
      "Nasally Yours is the Albums Anonymous emo act — 2000s pop-punk in the Dashboard Confessional mold, all about getting dumped for cosmetic reasons.",
  },
  "linkedin-park": {
    tagline:
      "LinkedIn Park is the Albums Anonymous nu-metal act, a play on Linkin Park — screaming about layoffs, job hunting and corporate life.",
    parodyOf: "Linkin Park",
  },
  "papa-john-windy": {
    tagline:
      "Papa John Windy is the Albums Anonymous indie-folk act — a Father John Misty riff whose wry songs include 'The Healthy Way to Eat Pizza.'",
    parodyOf: "Father John Misty",
  },
  "cuntreeboi": {
    tagline:
      "Cuntreeboi is the Albums Anonymous country act — contrarian twang about trading the lifted truck for a Prius.",
  },
  "the-random-ass-all-stars": {
    tagline:
      "The Random Ass All Stars is a rotating Albums Anonymous novelty supergroup behind oddball one-offs like the charity anthem 'Jimothy.'",
  },
};

export function getArtistSeo(slug: string): ArtistSeo | undefined {
  return ARTIST_SEO[slug];
}
