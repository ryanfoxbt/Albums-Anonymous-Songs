// Per-song SEO / GEO write-ups, hand-written from each song's lyrics.
//
// Each entry gives search engines and AI answer engines a plain,
// declarative description of what the song actually is (grounded in the
// lyrics), the parody angle, and the natural-language phrases people
// search when they're looking for "that funny song about X". Rendered on
// /song/[slug] as visible copy, meta description + keywords, and
// schema.org MusicRecording / FAQPage JSON-LD.
//
// Songs without an entry here fall back to the generated description.

export type SongSeo = {
  /** One declarative sentence. Used verbatim as the meta description. */
  summary: string;
  /** 2–3 sentences of lyric-grounded context, shown on the page. */
  about: string;
  /** Natural-language search phrases — meta keywords + a visible list. */
  searchTerms: string[];
  /** Q&A pairs — shown on the page and emitted as FAQPage JSON-LD. */
  faq: { q: string; a: string }[];
};

export const SONG_SEO: Record<string, SongSeo> = {
  blasties: {
    summary:
      '"Blasties" is a deliberately cringey fake product jingle from Albums Anonymous — a 15-second mock rock ad that counts down "three, two, one" into a "paper sock."',
    about:
      'A "Jingle Cringe" bit credited to the Random Ass Allstars: a full-commitment commercial jingle for an invented product called Blasties, built on a rocket-launch countdown and the nonsense promise that it "feels so good." It exists to sound exactly like an ad you\'d be annoyed to have stuck in your head.',
    searchTerms: [
      "fake product jingle song",
      "cringey commercial jingle parody",
      "funny fake advertisement song",
      "comedy jingle about a made up product",
      "rock jingle parody",
      "songs that sound like annoying ads",
    ],
    faq: [
      {
        q: 'What is "Blasties"?',
        a: 'A short comedic fake-commercial jingle from the Albums Anonymous comedy music podcast, performed as a mock rock ad for a product that does not exist.',
      },
      {
        q: "Is Blasties a real product?",
        a: "No. Blasties is invented for the joke — the song is a parody of advertising jingles, not a real ad.",
      },
    ],
  },

  colonoscopy: {
    summary:
      '"Colonoscopy" is a comedy rap about turning 40 and booking your first colonoscopy — the gross prep drink, the camera, and worrying the doctor will judge your butt hair.',
    about:
      'A hip-hop track by parody artist Kall of Booty featuring Cuntreeboi that turns a routine midlife health screening into an anxious rap. The narrator lists every reason he "needs to schedule that appointment," frets over "will I drink that nasty drink" and "will a camera be up there," and a cartoon voice signs off telling him to "be healthy, mang" and think about the next 40 years.',
    searchTerms: [
      "funny song about colonoscopy",
      "comedy rap about turning 40",
      "songs about getting older and health screenings",
      "colonoscopy prep humor song",
      "midlife health anxiety comedy song",
      "funny songs about doctor appointments",
    ],
    faq: [
      {
        q: 'What is "Colonoscopy" by Kall of Booty about?',
        a: 'A 40-year-old psyching himself up for his first colonoscopy — the scheduling, the prep drink, the camera, and general anxiety about the procedure — ending on a sincere "be healthy" message.',
      },
      {
        q: "Is this a parody of an existing rap song?",
        a: "No. It's an original comedy song written in a hip-hop style for the Albums Anonymous podcast, from the episode covering Elvis Costello's \"My Aim Is True.\"",
      },
    ],
  },

  constipated: {
    summary:
      '"Constipated" is a rambling comedy jam-band song about a stressed-out, unemployed dad who can\'t poop — complete with tension farts, a peanut allergy, and the economy.',
    about:
      'Performed by parody band Can\'t (a send-up of krautrock group Can), it\'s a mostly-spoken, meandering interior monologue: the narrator "missed his plop-or-tunity," blames "the stress of being a dad," worries a public bathroom trip will cost money he doesn\'t have, and keeps circling back to peanuts, which help him go even though he\'s allergic. The chorus is just "I\'m constipated" three times.',
    searchTerms: [
      "funny song about being constipated",
      "comedy song about not being able to poop",
      "stress constipation humor song",
      "jam band parody song",
      "songs about dad stress and anxiety",
      "funny song about the economy",
    ],
    faq: [
      {
        q: 'What is "Constipated" about?',
        a: 'A stressed, out-of-work dad narrating, in real time, his failure to have a bowel movement — tying it to anxiety, money, the economy, and a peanut allergy.',
      },
      {
        q: "Who is the artist Can't?",
        a: 'Can\'t is a recurring Albums Anonymous parody act whose name plays on the krautrock band Can; this song comes from the Tame Impala episode.',
      },
    ],
  },

  "costco-food-court": {
    summary:
      '"Costco Food Court" is a comedy rap ode to $1.50 Costco hot dogs and barely-edible pizza — the check-in line, the free-refill soda, and a body that can\'t take it anymore.',
    about:
      'A Kall of Booty hip-hop track about the exact ritual of the Costco food court: ordering a hot dog to get the free Coca-Cola, waiting for a table, mishearing your pizza number, and getting scolded for not checking in. It admits the food is "so cheap I got used to it, but my body can\'t handle it, I\'m getting old," and ends with the narrator eating Costco leftovers and farting alone at home.',
    searchTerms: [
      "funny song about Costco",
      "Costco food court hot dog song",
      "comedy rap about Costco pizza",
      "songs about getting old and cheap food",
      "Costco $1.50 hot dog humor",
      "dad life comedy songs",
    ],
    faq: [
      {
        q: 'What is "Costco Food Court" about?',
        a: "The specific experience of eating at the Costco food court — the hot dog and soda combo, the pizza check-in line, and the realization that aging makes the cheap food hurt.",
      },
      {
        q: "What episode is it from?",
        a: 'The Albums Anonymous episode on Deltron 3030, "Costco Pizza & Knob Fatigue."',
      },
    ],
  },

  "cucked-up-guy": {
    summary:
      '"Cucked up Guy" is a comedy song about grinding through 200+ job applications — ghosted by recruiters, lured by an MLM, broke, and badly needing a hug.',
    about:
      'Built as a fast, dense rap with a mournful country chorus, the song follows an out-of-work man "staring at the screen \'til I\'m fogging up my glasses," trapped "inside the algorithm," with rent due Monday and a partner giving him "a cold and heavy sigh." It flags up front that "this one\'s not funny," then leans into the bleak comedy of modern job-hunting and cratering self-esteem.',
    searchTerms: [
      "funny song about unemployment",
      "comedy song about job hunting and getting ghosted",
      "song about being broke and looking for work",
      "MLM scam humor song",
      "sad funny song about low self esteem",
      "songs about the job market and the algorithm",
    ],
    faq: [
      {
        q: 'What is "Cucked up Guy" about?',
        a: "A man's demoralizing long-term job search: hundreds of applications, recruiter ghosting, an MLM bait-and-switch, back pain, money stress, and needing emotional support.",
      },
      {
        q: "Is the song actually meant to be funny?",
        a: 'It opens by announcing "this one\'s not funny" — the comedy is in how relentlessly bleak and specific the job-hunt details get.',
      },
    ],
  },

  "fart-garfunkel": {
    summary:
      '"Fart Garfunkel" rewrites Simon & Garfunkel\'s "The Sound of Silence" as "The Sound of Breaking Wind" — a straight-faced folk ballad entirely about farting.',
    about:
      'Credited to parody artist Gasoline Dion, it keeps the somber melody and cadence of the 1964 folk classic while swapping every line for flatulence: "Hello darkness, rear end / I\'ve let one out of you again," "stepped on a duck and cut the cheese," "opened the oven, made air biscuits." The crowd "sobbed and wept as the fetid, foul smell crept."',
    searchTerms: [
      "Sound of Silence fart parody",
      "Simon and Garfunkel parody song",
      "funny folk song about farting",
      "The Sound of Breaking Wind song",
      "comedy parody of Sound of Silence",
      "acoustic parody song about gas",
    ],
    faq: [
      {
        q: 'What song is "Fart Garfunkel" a parody of?',
        a: 'Simon & Garfunkel\'s "The Sound of Silence" — same melody and structure, with every lyric rewritten to be about flatulence.',
      },
      {
        q: "Who performs it?",
        a: 'Gasoline Dion, a recurring Albums Anonymous parody artist; it appears on the "Best of Permanent Records" episode.',
      },
    ],
  },

  "fart-grenade": {
    summary:
      '"Fart Grenade" is a lounge-music song about deploying a cupped-hand "toot grenade" in a crowded elevator and blaming it on a woman named Dolores.',
    about:
      'From parody act Smellevator, whose entire persona is farting in elevators over easy-listening backing. The track narrates the tactic in detail — "right hand forms a cup, I execute the violent toot and leave \'em in the crop dust" — then the culprit hides in the hall, re-boards for "a new box of peeps," and pins it on Dolores. It ends with an old man snapping, "Dammit Dolores, I told you to pack your cheese pills!"',
    searchTerms: [
      "funny song about farting in an elevator",
      "elevator music fart song",
      "comedy song about blaming your fart on someone",
      "Smellevator songs",
      "lounge music parody about gas",
      "songs about crop dusting",
    ],
    faq: [
      {
        q: 'What is "Fart Grenade" about?',
        a: 'A rider who "arms" a fart in a cupped hand, releases it in a packed elevator, hides, comes back for a fresh crowd, and blames someone named Dolores.',
      },
      {
        q: "What is Smellevator?",
        a: "A recurring Albums Anonymous parody act that makes elevator/lounge music entirely about passing gas in elevators.",
      },
    ],
  },

  "how-do-you-shave-your-balls": {
    summary:
      '"How do you Shave your Balls?" is a lush Tame Impala–style pop song earnestly asking why men never trade grooming tips the way women do.',
    about:
      'Parody artist Lame Impala layers falsetto harmonies over a sincere plea: men should "come back to an age where we\'re better again" by talking openly about shaving down there, instead of being "afraid to Google that" for fear of finding "a schlong that isn\'t mine" — or worse, that "I\'ll like it and keep Googling that shit."',
    searchTerms: [
      "funny song about shaving down there",
      "Tame Impala parody song",
      "comedy song about men's grooming",
      "psych pop parody about manscaping",
      "songs about men not talking about vulnerable things",
      "songs about being afraid to Google something",
    ],
    faq: [
      {
        q: 'What is "How do you Shave your Balls?" about?',
        a: 'A man genuinely wishing men would share personal-grooming advice with each other, and being too embarrassed to search for it online.',
      },
      {
        q: "Who is Lame Impala?",
        a: 'A recurring Albums Anonymous parody artist in the style of Tame Impala; this track is from the Tame Impala episode.',
      },
    ],
  },

  "jacket-on-jacket-off": {
    summary:
      '"Jacket On, Jacket Off" is a comedy rap that chants its title over the daily routine of a cold, skinny, broke dad who never leaves home without a jacket.',
    about:
      'Opening with a shout-out to Jim James of My Morning Jacket ("your band\'s passionate about jackets"), Kall of Booty raps through walking the wiener dog, toasting Raisin Bran in a pan "cuz we\'re poor," and needing "extra pockets for my wallet and my phone" because "my upper body\'s cold, no meat on my bones." Pulling on an old jacket, he finds "a mask and a pacifier in the pocket."',
    searchTerms: [
      "funny song about always wearing a jacket",
      "My Morning Jacket parody song",
      "comedy rap about being cold all the time",
      "songs about a skinny guy who is always cold",
      "dad morning routine comedy song",
      "funny songs about being broke",
    ],
    faq: [
      {
        q: 'What is "Jacket On, Jacket Off" about?',
        a: 'A lean, always-cold dad\'s morning routine and his dependence on wearing a jacket, chanted over a "jacket on / jacket off" hook.',
      },
      {
        q: "Why the Jim James reference?",
        a: 'It nods to My Morning Jacket; the song is from the Albums Anonymous "Linkin Park Meteora vs. LinkedIn Park" episode.',
      },
    ],
  },

  jimothy: {
    summary:
      '"Jimothy" is a soft-rock charity-anthem parody about saving the world for a short-spined wild raccoon named Jimothy found near the Puget Sound.',
    about:
      'The Random Ass All Stars play it like a "We Are the World" benefit single, except the cause is a single disabled raccoon: "Russia, China, and Iran... clone Jimothy, calm the F down." The chorus coos over his gait — "skulk a little, hop a little, limp a little too" — and hopes "you\'re not a Seahawks fan."',
    searchTerms: [
      "funny song about a raccoon",
      "charity single parody song",
      "We Are the World parody",
      "comedy soft rock song about an animal",
      "song about saving the world for a raccoon",
      "wholesome absurd comedy songs",
    ],
    faq: [
      {
        q: 'What is "Jimothy" about?',
        a: 'A tender charity-anthem-style plea for world peace on behalf of Jimothy, a "short-spined wild raccoon" and "cute genetic anomaly."',
      },
      {
        q: "Is Jimothy a real animal?",
        a: "No — Jimothy is invented for the song, which parodies celebrity charity singles.",
      },
    ],
  },

  "lactose-intolerant": {
    summary:
      '"Lactose Intolerant" is a short comedy rap about slowly realizing that cheese is why you keep farting — like "Machine Gun Fart Kelly."',
    about:
      'A brief hip-hop track from parody act The Weekdays (a play on The Weeknd) in which the narrator keeps "testing it but not thinking," eating cheese and then wondering, "Am I lactose intolerant? Is tonight a good night to test that?" while "the room\'s a-stinkin\'."',
    searchTerms: [
      "funny song about being lactose intolerant",
      "comedy song about cheese and farting",
      "Machine Gun Kelly fart pun song",
      "The Weeknd parody song",
      "songs about dairy problems",
      "short funny rap about gas",
    ],
    faq: [
      {
        q: 'What is "Lactose Intolerant" about?',
        a: "Someone piecing together that dairy is causing their gas, and idly deciding whether tonight is a good night to test the theory again.",
      },
      {
        q: "Who is The Weekdays?",
        a: 'A recurring Albums Anonymous parody act whose name plays on The Weeknd; this song is from the "Linkin Park Meteora vs. LinkedIn Park" episode.',
      },
    ],
  },

  "moley-sack": {
    summary:
      '"Moley Sack" is an Elvis Costello–style rock song about a guy who gets an embarrassing mole frozen off his scrotum and finally works up some dating confidence.',
    about:
      'Parody artist Elvis CauseSmello tells a small coming-of-age story: as a young man he had "a big mole on my sack" and swore "no one\'s ever gonna see that," until comparing himself to "those beach girls" sent him to the doctor to freeze it off. Newly "blank canvas," he buys a Smirnoff, gets his "eyes rolled" by the first girl he approaches, and decides he\'s "happy today" anyway.',
    searchTerms: [
      "Elvis Costello parody song",
      "funny song about a mole removal",
      "comedy rock song about insecurity and dating",
      "songs about getting your confidence back",
      "funny songs about going to the doctor",
      "coming of age comedy song",
    ],
    faq: [
      {
        q: 'What is "Moley Sack" about?',
        a: 'A young man\'s insecurity about a mole on his scrotum, getting it removed, and the small confidence boost that follows even after a failed pickup attempt.',
      },
      {
        q: "Who is Elvis CauseSmello?",
        a: "A recurring Albums Anonymous parody artist in the style of Elvis Costello; the song is from the Elvis Costello \"My Aim Is True\" episode.",
      },
    ],
  },

  "my-heart-s-forever-broken": {
    summary:
      '"My Heart\'s Forever Broken" is an emo parody about a guy who keeps getting dumped over his hair, his eyeliner, his girl\'s-skinny-jeans, and a lip-ring canker sore.',
    about:
      'Sung by parody artist Nasally Yours in full 2000s emo mode (name-checking Dashboard Confessional), the narrator is "so emotional about everything" and "existential, whatever that means." Each verse is a new breakup for a superficial reason, and his big threat is to "send a strongly worded text to you and your friends."',
    searchTerms: [
      "emo parody song",
      "funny song about getting dumped",
      "2000s emo music parody",
      "Dashboard Confessional parody",
      "comedy song about being too emotional",
      "funny break up songs",
    ],
    faq: [
      {
        q: 'What is "My Heart\'s Forever Broken" about?',
        a: "A hyper-emotional emo kid getting repeatedly dumped over cosmetic things — his hair, makeup, and piercings — and responding with strongly worded texts.",
      },
      {
        q: "What style is it parodying?",
        a: 'Early-2000s emo and pop-punk; it\'s from the Albums Anonymous episode on The Offspring\'s "Americana."',
      },
    ],
  },

  "open-to-work": {
    summary:
      '"Open To Work" is a 30-second metal song that screams a laid-off tech worker\'s LinkedIn skills list — Claude Code, HubSpot, product management, email marketing.',
    about:
      'Parody band LinkedIn Park (a Linkin Park riff) turns the green "#OpenToWork" banner into a nu-metal breakdown: the vocalist bellows a résumé of overlapping job functions — "a Q&A engineer who does email marketing" — and ends on the title as a desperate shout.',
    searchTerms: [
      "funny song about being laid off",
      "LinkedIn Park parody",
      "Linkin Park parody song",
      "comedy metal song about job hunting",
      "open to work LinkedIn humor",
      "songs about tech layoffs",
    ],
    faq: [
      {
        q: 'What is "Open To Work" about?',
        a: 'A just-laid-off tech generalist screaming their mixed bag of skills, like a LinkedIn "Open to Work" profile set to metal.',
      },
      {
        q: "Who is LinkedIn Park?",
        a: 'A recurring Albums Anonymous parody band based on Linkin Park; the song is from the "Meteora vs. LinkedIn Park" episode.',
      },
    ],
  },

  peanuts: {
    summary:
      '"Peanuts" is a jam-band comedy song about being allergic to peanuts but no other nuts — and spiraling into whether that means you\'re allergic to all legumes.',
    about:
      'Parody band Can\'t works through the logic out loud: he can eat "walnuts, almonds, cashews and hazelnuts," but "it\'s said that peanuts are closer to a legume," so "maybe I\'m allergic to legumes." A call-and-response outro denies him snap peas, garbanzo beans, and chickpeas ("that\'s the same as garbanzo beans, man").',
    searchTerms: [
      "funny song about peanut allergy",
      "comedy song about food allergies",
      "are peanuts a legume song",
      "jam band parody song",
      "songs about being allergic to nuts",
      "peanut allergy humor",
    ],
    faq: [
      {
        q: 'What is "Peanuts" about?',
        a: 'Having a peanuts-only allergy and overthinking it into a fear of all legumes — snap peas, garbanzo beans and chickpeas included.',
      },
      {
        q: "What episode is it from?",
        a: 'The Albums Anonymous episode "Can: Ege Bamyasi vs. Can\'t: Egg Basmati."',
      },
    ],
  },

  "penis-allergy": {
    summary:
      '"Penis Allergy" is a short acoustic comedy song about a rough patch: no job, kids who won\'t sleep, and a wife who\'s suddenly "allergic" to sex.',
    about:
      'Parody band Can\'t delivers it deadpan in baritone over acoustic guitar — a bulleted list of a dad\'s problems ("I look like shit, I need to shave my bush, need doc appointment") anchored by the repeated line "my wife has a penis allergy," i.e. "she has enough kids." It punctuates itself with a flat "Rock!"',
    searchTerms: [
      "funny song about a dead bedroom",
      "comedy song about marriage after kids",
      "songs about a rough patch in a marriage",
      "deadpan acoustic comedy song",
      "funny songs about being a tired dad",
      "no sex after kids humor song",
    ],
    faq: [
      {
        q: 'What is "Penis Allergy" about?',
        a: 'A worn-down dad listing his troubles — unemployment, sleepless kids, low grooming standards — and a partner who is done having sex ("a penis allergy").',
      },
      {
        q: "How long is the song?",
        a: "It's a short piece — a deadpan verse and a repeated title line, from the Albums Anonymous \"Linkin Park Meteora\" episode.",
      },
    ],
  },

  phone: {
    summary:
      '"Phone" is a smooth R&B song that\'s just a list of every moment you\'re on your phone — waking up, pooping, mowing the lawn, texting your partner, therapy.',
    about:
      'Parody act The Weekdays sets compulsive phone use to a slow R&B groove, tagging every activity with the word "phone": "check my email check the weather phone," "text my girl I love her but I hate her," "sleep stories help me down the fader phone," ending on "talking to my therapist phoooone."',
    searchTerms: [
      "funny song about phone addiction",
      "comedy R&B song about being on your phone",
      "The Weeknd parody song",
      "songs about screen time",
      "funny songs about doom scrolling",
      "always on my phone song",
    ],
    faq: [
      {
        q: 'What is "Phone" about?',
        a: "Nonstop phone use across an entire day, listed activity by activity over a mellow R&B beat.",
      },
      {
        q: "Who performs it?",
        a: 'The Weekdays, a recurring Albums Anonymous parody act (a play on The Weeknd); it\'s from the Elvis Costello "My Aim Is True" episode.',
      },
    ],
  },

  "pickup-truck-blues": {
    summary:
      '"Pickup Truck Blues" is a country song about a good ol\' boy who ditches his lifted truck for a Prius and loves fuel efficiency "on par with my love for Jesus."',
    about:
      'Parody artist Cuntreeboi flips every country trope: the narrator misses the attention his "big lifted truck" got from "them country girls," but "the cost of gas" and the fact that "fossil fuels are a dying breed" won him over to "practical proficiency." The bridge is a seduction — "Let\'s make love in the back of my Prius, there\'s enough room if you fold the seats down."',
    searchTerms: [
      "funny country song about a Prius",
      "comedy song about trading a truck for a hybrid",
      "anti pickup truck country parody",
      "songs about fuel efficiency",
      "eco friendly country song parody",
      "funny songs about trucks",
    ],
    faq: [
      {
        q: 'What is "Pickup Truck Blues" about?',
        a: 'A country guy giving up his lifted pickup for a fuel-efficient Prius, and being at peace with looking less cool.',
      },
      {
        q: "Is it pro-truck or anti-truck?",
        a: "It's a gentle send-up of truck culture — the narrator ends up preferring the Prius for practical and financial reasons.",
      },
    ],
  },

  "public-restroom": {
    summary:
      '"Public Restroom" is a ska song built as a first-date confession contest about bathroom anxiety — hovering over strange toilets, and only wiping on Tuesdays.',
    about:
      'Parody band Can\'t frames it as two people trading gross honesty to build "report": he has "lots of anxiety about where I poo" and "trained my butt to be a morning pooper"; she\'s "really into Chad" but admits "I only wipe on Tuesdays." The chorus is a horn-driven lament about hovering in "a public restroom, to do what humans got to do."',
    searchTerms: [
      "funny song about bathroom anxiety",
      "ska parody song",
      "comedy song about being scared of public toilets",
      "songs about pooping anxiety",
      "funny first date song",
      "shy bowel humor song",
    ],
    faq: [
      {
        q: 'What is "Public Restroom" about?',
        a: "A first date where both people confess embarrassing bathroom habits and anxieties, set to upbeat ska.",
      },
      {
        q: "What episode is it from?",
        a: 'The Albums Anonymous Tame Impala episode, "Reggaenomics for a real republican & the Great Ball-Loofah Debate."',
      },
    ],
  },

  "rockstar-dad": {
    summary:
      '"Rockstar Dad" is a pop song about a musician who sold his catalog to Sony and now writes songs about snacks between wiping butts, while his toddler acts like the real rockstar.',
    about:
      'Parody artist Lame Impala contrasts faded rock-star cool with parenting: "Sony bought my past and future works, so I\'ll write about anything," including letting "the oldest" (who "can read now") write songs "on days I need chill." The bridge flips perspective to the kid trashing hotel rooms and the kitchen — "this kid\'s on a mission."',
    searchTerms: [
      "funny song about being a dad and a musician",
      "comedy song about selling your music catalog",
      "rockstar turned stay at home dad song",
      "songs about parenting toddlers",
      "Tame Impala parody",
      "funny songs about dad life",
    ],
    faq: [
      {
        q: 'What is "Rockstar Dad" about?',
        a: "A musician balancing a sold-off catalog and lost cool with full-time parenting, writing throwaway songs about snacks while his toddler behaves like the star.",
      },
      {
        q: "Who is Lame Impala?",
        a: "A recurring Albums Anonymous parody artist based on Tame Impala; this track is from the Tame Impala episode.",
      },
    ],
  },

  "roses-thorns-and-buds": {
    summary:
      '"Roses, Thorns, And Buds" is a comedy rap about a couple bringing a therapist\'s check-in exercise home to clear the air — and revive their sex life.',
    about:
      'Kall of Booty, featuring Hot Girl Hooks, narrates a not-cheap therapy session where the couple learns the "roses, thorns, and buds" reflection ritual and uses it to "get the poison out." The hook is blunt about the goal — "tell me what I\'m doing wrong... so we can fuck" — with the husband bargaining chores ("I\'ll even vacuum") for intimacy. Contains explicit language.',
    searchTerms: [
      "funny song about couples therapy",
      "comedy rap about marriage counseling",
      "roses thorns and buds exercise song",
      "songs about doing chores to have sex",
      "funny songs about married life",
      "relationship check-in humor song",
    ],
    faq: [
      {
        q: 'What is "Roses, Thorns, And Buds" about?',
        a: 'A married couple using a therapist\'s "roses, thorns, and buds" check-in to air grievances and reconnect physically.',
      },
      {
        q: "Is the song explicit?",
        a: "Yes — it contains strong language and frank talk about sex.",
      },
    ],
  },

  "sad-thoughts-and-t-p-at-costco": {
    summary:
      '"Sad Thoughts and T.P at Costco" is a comedy rap about doom-scrolling the news in a Costco aisle — buying toilet paper in bulk while the country feels like it\'s ending.',
    about:
      'A melancholy Kall of Booty track where political dread ("the country charging down a slippery slope") collides with errands: he skips the free samples, small-talks "Edna," buys "Costco condoms" and a "double box of Cheeze-its," fires off insults at Trump, and still notes, "I do want to upgrade my membership though." Contains political references and profanity.',
    searchTerms: [
      "funny song about Costco and depression",
      "comedy rap about the news and anxiety",
      "doom scrolling humor song",
      "political comedy song about America",
      "songs about buying toilet paper in bulk",
      "sad funny songs about current events",
    ],
    faq: [
      {
        q: 'What is "Sad Thoughts and T.P at Costco" about?',
        a: "Shopping at Costco while spiraling about the state of the country — mixing bulk groceries, political anger, and low-grade despair.",
      },
      {
        q: "What episode is it from?",
        a: 'The Albums Anonymous episode on Deltron 3030, "Costco Pizza & Knob Fatigue."',
      },
    ],
  },

  "slow-down-the-smushing": {
    summary:
      '"Slow Down the Smushing" is an Elvis Costello–style rock song about how getting a small yappy dog — and then a baby named Jerry — kills a couple\'s sex life.',
    about:
      'Parody artist Elvis CauseSmello charts the decline: they get "a little annoying tiny dog" that "knows what to do, barks, gets in between," then decide a kid will help and "name him Jerry," which of course means "man gets benched again." He makes peace with it — "he\'s got a little buddy, and that is pretty awesome."',
    searchTerms: [
      "funny song about your dog interrupting sex",
      "comedy song about sex life after a baby",
      "Elvis Costello parody song",
      "songs about a small annoying dog",
      "funny songs about parenthood killing romance",
      "dad life rock parody",
    ],
    faq: [
      {
        q: 'What is "Slow Down the Smushing" about?',
        a: "A couple\'s intimacy getting derailed first by a needy small dog and then by a new baby, told with resigned good humor.",
      },
      {
        q: "Who is Elvis CauseSmello?",
        a: 'A recurring Albums Anonymous parody artist based on Elvis Costello; the song is from the "My Aim Is True" episode.',
      },
    ],
  },

  smellevator: {
    summary:
      '"Smellevator" is the signature lounge-music song about being trapped in a crowded, stuck elevator while desperately needing to fart — and finally losing that battle.',
    about:
      'The title track for parody act Smellevator: descending "from the 40th floor," the narrator picks up passengers, gets stuck, feels "bubbles form in my butthole," and gives in around "the 13th floor" as a woman "covers her nose." He apologizes to the whole group and blames stress plus "apricots... beer, and cheese and gordita Supremes."',
    searchTerms: [
      "funny song about farting in an elevator",
      "elevator music comedy song",
      "song about being stuck in an elevator",
      "Smellevator song",
      "lounge music parody about gas",
      "comedy songs about awkward elevator rides",
    ],
    faq: [
      {
        q: 'What is "Smellevator" about?',
        a: "Being stuck in a full elevator while fighting, and ultimately failing, to hold in a fart — then apologizing to everyone trapped inside.",
      },
      {
        q: "Is this the Smellevator project's main song?",
        a: 'Yes — Smellevator is a recurring Albums Anonymous parody act, and this is its title track, from "The Stone Roses" episode.',
      },
    ],
  },

  "standing-on-the-bar": {
    summary:
      '"Standing on the Bar" is a rowdy country song about a touring musician living the dream — dancing on the bar, doing whiskey shots off his date, and falling off.',
    about:
      'Kall of Booty, featuring Shabooby, plays a road-worn country star who\'s "amped up this high," texting "all my ladies," and literally "standing on the bar clapping and foot stomping." A bartender recognizes him ("I play your song on banjo"), buys his drinks, and after he eats it off the bar — "that fall did ring my bell" — he vows to "give this night some hell."',
    searchTerms: [
      "funny country song about partying",
      "comedy song about dancing on the bar",
      "drunk country song parody",
      "songs about touring musician life",
      "whiskey shots comedy song",
      "rowdy bar anthem parody",
    ],
    faq: [
      {
        q: 'What is "Standing on the Bar" about?',
        a: "A touring country artist blowing off steam at the end of a tour — bar-top dancing, whiskey shots, getting recognized, and taking a spill.",
      },
      {
        q: "What genre is it?",
        a: 'Country, styled as a club-banger; it features the recurring parody artist Shabooby.',
      },
    ],
  },

  "stretch-the-smell": {
    summary:
      '"Stretch the Smell" is a lounge song about a guy who books rooms in tall hotels specifically so he has more elevator to fart in — and has started to enjoy it.',
    about:
      'Parody act Smellevator escalates the bit: the narrator "only stay[s] in big hotels so I could stretch the smell" and "only book[s] the big high-rise so I could fart on guys." He admits the first "smell-evator" was "an ac-ci-dent," "but now I love being smelly mean," and shrugs off the loud family next door: "but it\'s okay."',
    searchTerms: [
      "funny song about farting in hotels",
      "elevator music parody song",
      "Smellevator songs",
      "comedy song about enjoying being gross",
      "lounge music about gas",
      "funny songs about hotel elevators",
    ],
    faq: [
      {
        q: 'What is "Stretch the Smell" about?',
        a: "A man who deliberately books high-rise hotels so he has more elevator distance to fart in, and who now openly enjoys it.",
      },
      {
        q: "What episode is it from?",
        a: 'The Albums Anonymous episode on The Offspring\'s "Americana."',
      },
    ],
  },

  "sun-buddies": {
    summary:
      '"Sun Buddies" is a comedy rap celebrating the practical friend who does your back sunscreen, guards the cooler, and carpools to the beach to split gas.',
    about:
      'Kall of Booty, featuring the Random Ass Allstars, frames beach friendship as logistics: "I\'m a king but I need a consultant" to watch "the cooler and the keys," fend off chip-stealing seagulls as "the perimeter guard," and handle "high-level beach day organization." The recurring hook is the unreachable spot — "there\'s always this part on my back I can\'t get."',
    searchTerms: [
      "funny song about beach friends",
      "comedy rap about applying sunscreen",
      "songs about a practical best friend",
      "beach day humor song",
      "carpool to the beach song",
      "who does your back sunscreen song",
    ],
    faq: [
      {
        q: 'What is "Sun Buddies" about?',
        a: 'The value of a beach buddy for practical reasons — sunscreen on your back, watching your stuff, splitting gas, and guarding snacks from seagulls.',
      },
      {
        q: "What's the tone?",
        a: "Wholesome and absurd — an earnest ode to friendship framed as beach-day logistics.",
      },
    ],
  },

  swirling: {
    summary:
      '"Swirling" is a short lounge-music song about an elevator "swirling with fart dust" — made for one body, now shared with everyone in the box.',
    about:
      'A brief Smellevator track that mostly repeats its central image: the elevator is "swirling with fart dust," "I made it for my body and now it\'s for you," and there\'s "smelly butt-jazz in the box" while other riders gasp "when they try to talk."',
    searchTerms: [
      "short funny song about farting in an elevator",
      "Smellevator swirling song",
      "elevator music fart parody",
      "comedy songs about fart dust",
      "funny lounge music",
      "quick comedy song about gas",
    ],
    faq: [
      {
        q: 'What is "Swirling" about?',
        a: 'An elevator filled with "fart dust" that the narrator made "for my body" and is now inflicting on everyone else in the car.',
      },
      {
        q: "How long is it?",
        a: "It's a short track built on a repeated hook, part of the Smellevator parody project.",
      },
    ],
  },

  "the-healthy-way-to-eat-pizza": {
    summary:
      '"The Healthy Way to Eat Pizza" is a mellow indie-folk song from a self-styled health nut whose entire wellness philosophy is blotting pizza grease with a napkin.',
    about:
      'Parody artist Papa John Windy sings it earnestly: "you\'ll never grow to get this strong and strappin\' without dabbin\' the grease off your pizza with a napkin," with a spoken aside that "the grease that pools within the crispy edges of pepperoni is high in cholesterol and could lead to heart problems." The hook is just him repeating that he dabs the grease off with a napkin.',
    searchTerms: [
      "funny song about eating pizza healthy",
      "comedy folk song about dabbing pizza grease",
      "songs about being a health nut",
      "pizza napkin grease joke song",
      "wholesome funny songs about food",
      "indie folk parody song",
    ],
    faq: [
      {
        q: 'What is "The Healthy Way to Eat Pizza" about?',
        a: "A man who considers himself health-conscious mainly because he blots the grease off his pizza slices with a napkin.",
      },
      {
        q: "Who is Papa John Windy?",
        a: "A recurring Albums Anonymous parody artist; the song is from the Elvis Costello \"My Aim Is True\" episode.",
      },
    ],
  },

  "the-stuffy-march": {
    summary:
      '"The Stuffy March" is a repetitive, hypnotic bedtime song about a parade of stuffed animals marching a kid off to sleep.',
    about:
      'Kall of Booty builds it as a near-mantra — "this is the stuffy march, the march of stuffies" — that gradually pivots from marching to "now time to get sleepy." A brief break ("these stuffies are out of control... help me escape their marching madness") gives way to a spoken "now go to sleep kid. Good night."',
    searchTerms: [
      "funny bedtime song for kids",
      "comedy song about stuffed animals",
      "repetitive song to make a kid sleepy",
      "stuffies march song",
      "parent bedtime routine humor song",
      "dad life lullaby parody",
    ],
    faq: [
      {
        q: 'What is "The Stuffy March" about?',
        a: 'A "march" of stuffed animals used as a hypnotic, repetitive bedtime routine that winds a child down to sleep.',
      },
      {
        q: "Is it meant for actual bedtime use?",
        a: "It's a comedy song, but it's structured like a real wind-down routine, ending with a spoken good night.",
      },
    ],
  },

  "time-to-wake-up-the-monkeys": {
    summary:
      '"Time to Wake up the Monkeys" is a short, chant-like indie-folk song about doing exactly that — bananas, funky moves, and finishing tourists\' drinks.',
    about:
      'The Random Ass All Stars keep it brief and repetitive: the narrator wants to "wake up the monkeys," gets "funky" off a banana, "finish[es] tourist drinks," and takes a "quick toot on tourist" before swinging "from the trees."',
    searchTerms: [
      "funny song about monkeys",
      "short absurd comedy song",
      "indie folk parody song",
      "silly song about waking up monkeys",
      "funny songs about zoos or the jungle",
      "weird comedy chant song",
    ],
    faq: [
      {
        q: 'What is "Time to Wake up the Monkeys" about?',
        a: 'A short absurd chant about waking up monkeys, eating a banana, getting funky, and stealing tourists\' leftover drinks.',
      },
      {
        q: "How long is the song?",
        a: "Very short — a brief, looping chant from the Random Ass All Stars.",
      },
    ],
  },

  "water-in-the-hole": {
    summary:
      '"Water in the Hole" is a soulful falsetto pop song offering a very thorough shower routine — and a warning not to jump back in after using the water for fun.',
    about:
      'Parody artist Lame Impala delivers detailed hygiene instructions over jazzy guitar and falsetto runs: rinse "shower water in your butthole," "scrub your ween," and "my balls and my balls and my balls and my balls" repeatedly, closing with the public-service line, "don\'t jump in the shower folks after you pleasure your bum with water."',
    searchTerms: [
      "funny song about showering",
      "Tame Impala parody song",
      "comedy pop song about personal hygiene",
      "falsetto parody song",
      "songs about washing thoroughly",
      "absurd R&B parody",
    ],
    faq: [
      {
        q: 'What is "Water in the Hole" about?',
        a: "An extremely detailed shower-and-scrub routine, delivered as smooth falsetto pop, with a closing warning about reusing the shower after self-pleasure.",
      },
      {
        q: "Who is Lame Impala?",
        a: "A recurring Albums Anonymous parody artist based on Tame Impala; the song is from the Tame Impala episode.",
      },
    ],
  },
};

export function getSongSeo(slug: string): SongSeo | undefined {
  return SONG_SEO[slug];
}
