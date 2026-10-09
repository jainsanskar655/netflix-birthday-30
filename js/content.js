/* ===============================================================
   DEFAULT CONTENT
   ---------------------------------------------------------------
   Everything here can be changed from Configure Mode (Ctrl + A + S)
   or by editing this file directly. Admin changes are stored in the
   browser and override these defaults.
   =============================================================== */
window.DEFAULT_CONTENT = {
  site: {
    name: "Sagar",
    age: 30,
    birthday: "20 October 2026"
  },

  /* Netflix intro animation played on the splash screen */
  intro: "assets/videos/netflix-intro.mp4",

  /* Profiles shown on "Who's watching?" */
  profiles: [
    { id: "sagar",   name: "Sagar",      initial: "S", color: "linear-gradient(135deg,#e50914,#7a060b)" },
    { id: "family",  name: "Mom & Dad",  initial: "M", color: "linear-gradient(135deg,#f5c542,#c98a12)" },
    { id: "friends", name: "Best Friends", initial: "B", color: "linear-gradient(135deg,#2ecc71,#14743b)" },
    { id: "loved",   name: "Favourites", initial: "★", color: "linear-gradient(135deg,#9b59b6,#5b2c6f)" }
  ],

  /* Featured title on the home hero */
  hero: "main",

  /* Horizontal rows on the home page */
  rows: [
    { id: "continue",  title: "Continue Watching for Sagar",        type: "cards",  itemIds: ["main", "w1", "w2", "w3", "w4"] },
    { id: "new",       title: "New Birthday Wishes",                 type: "cards",  itemIds: ["w5", "w6", "w7", "w8", "w1", "w3"] },
    { id: "because",   title: "Because apparently 30 years wasn't enough", type: "cards", itemIds: ["w2", "w4", "w5", "w7", "main"] },
    { id: "top10",     title: "Top 10 in Sagar's Life",              type: "ranked", itemIds: ["main", "w1", "w5", "w2", "w3", "w6", "w7", "w4", "w8", "w1"] },
    { id: "roast",     title: "The Roast — Not For The Faint Hearted", type: "cards", itemIds: ["w3", "w7", "w8", "w6"] },
    { id: "only",      title: "Only on N",                           type: "cards",  itemIds: ["w5", "w4", "w2", "w8"] }
  ],

  /* Legendary library. Each title can hold several "episodes" (wishes). */
  library: {
    main: {
      id: "main",
      badge: "N SERIES",
      title: "Sagar: The 30th Season",
      from: "A Netflix Birthday Original",
      description: "Thirty years. A thousand stories. One ridiculously special main character. A celebration of a life worth binge-watching — press play and let the memories roll.",
      hue: 355,
      genres: ["Biography", "Comedy", "Drama", "Wholesome"],
      starring: ["Sagar", "Everyone who loves him"],
      creator: "The People Who Know Him Best",
      year: 2026,
      maturity: "30",
      match: 100,
      episodes: [
        { id: "main-e1", season: 1, episode: 1, title: "The Early Years",     description: "Before the legend, there was a kid. Photos, chaos and questionable haircuts.", duration: "3:12", video: "assets/videos/play1.mp4", hue: 355 },
        { id: "main-e2", season: 1, episode: 2, title: "The Chaos Era",       description: "Friendships were forged, rules were broken, memories were made.", duration: "2:48", video: "assets/videos/play1.mp4", hue: 20 },
        { id: "main-e3", season: 1, episode: 3, title: "The 30th Chapter",    description: "The season finale nobody wants to end. Happy 30th, Sagar.", duration: "4:05", video: "assets/videos/play1.mp4", hue: 280 }
      ]
    },
    w1: { id: "w1", badge: "N FILM", title: "A Message From Mom & Dad", from: "Family", hue: 45,
      description: "From the two people who knew you before you could even walk. A few tears, a lot of love, and one very proud pair of parents.",
      genres: ["Family", "Emotional"], starring: ["Mom", "Dad"], year: 2026, maturity: "U", match: 99,
      episodes: [{ id: "w1-e1", season: 1, episode: 1, title: "A Message From Mom & Dad", description: "The people who've known him the longest.", duration: "2:00", video: "assets/videos/play1.mp4", hue: 45 }] },
    w2: { id: "w2", badge: "N FILM", title: "30 Years of Chaos", from: "Best Friends", hue: 150,
      description: "Friendship, questionable decisions and stories that should probably never have made it to the internet. Consider this payback.",
      genres: ["Comedy", "Friendship"], starring: ["The Group Chat"], year: 2026, maturity: "18", match: 97,
      episodes: [{ id: "w2-e1", season: 1, episode: 1, title: "30 Years of Chaos", description: "Chaos, as promised.", duration: "1:42", video: "assets/videos/play1.mp4", hue: 150 }] },
    w3: { id: "w3", badge: "N FILM", title: "The Roast", from: "Everyone", hue: 5,
      description: "Because love without a little humiliation isn't really friendship. Sit down, Sagar — this one's going to sting.",
      genres: ["Comedy", "Roast"], starring: ["Your So-Called Friends"], year: 2026, maturity: "18", match: 98,
      episodes: [{ id: "w3-e1", season: 1, episode: 1, title: "The Roast", description: "Definitely not safe for the faint-hearted.", duration: "1:30", video: "assets/videos/play1.mp4", hue: 5 }] },
    w4: { id: "w4", badge: "N FILM", title: "My Favourite Person", from: "The One Who Loves You Most", hue: 320,
      description: "A little something from the person who thinks about you a ridiculous amount. Warning: feelings ahead.",
      genres: ["Romance", "Emotional"], starring: ["Someone very lucky"], year: 2026, maturity: "U", match: 100,
      episodes: [{ id: "w4-e1", season: 1, episode: 1, title: "My Favourite Person", description: "For no.1.", duration: "2:30", video: "assets/videos/play1.mp4", hue: 320 }] },
    w5: { id: "w5", badge: "N FILM", title: "The People Who Know You Best", from: "Friends", hue: 200,
      description: "Messages from the people who have been there through it all — the highs, the lows and the truly embarrassing.",
      genres: ["Documentary", "Friendship"], starring: ["The Whole Gang"], year: 2026, maturity: "U", match: 96,
      episodes: [{ id: "w5-e1", season: 1, episode: 1, title: "The People Who Know You Best", description: "Straight from the horses' mouths.", duration: "2:15", video: "assets/videos/play1.mp4", hue: 200 }] },
    w6: { id: "w6", badge: "N FILM", title: "One More For The Memories", from: "Friends", hue: 260,
      description: "Because one birthday message was clearly never going to be enough. Turn the volume up for this one.",
      genres: ["Comedy"], starring: ["Everyone"], year: 2026, maturity: "U", match: 95,
      episodes: [{ id: "w6-e1", season: 1, episode: 1, title: "One More For The Memories", description: "The extra one.", duration: "1:45", video: "assets/videos/play1.mp4", hue: 260 }] },
    w7: { id: "w7", badge: "N FILM", title: "That Legendary Trip", from: "Friends", hue: 30,
      description: "You know the one. The trip we still argue about to this day. Relive it in glorious high definition.",
      genres: ["Adventure", "Comedy"], starring: ["The Usual Suspects"], year: 2026, maturity: "U", match: 94,
      episodes: [{ id: "w7-e1", season: 1, episode: 1, title: "That Legendary Trip", description: "No context needed.", duration: "2:02", video: "assets/videos/play1.mp4", hue: 30 }] },
    w8: { id: "w8", badge: "N FILM", title: "The Embarrassing Phase", from: "Family", hue: 90,
      description: "We found the photos. We're not going to elaborate. Happy birthday, superstar.",
      genres: ["Documentary", "Comedy"], starring: ["Unfortunate younger you"], year: 2026, maturity: "18", match: 93,
      episodes: [{ id: "w8-e1", season: 1, episode: 1, title: "The Embarrassing Phase", description: "You've been warned.", duration: "1:20", video: "assets/videos/play1.mp4", hue: 90 }] }
  }
};
