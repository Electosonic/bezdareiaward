export type Candidate = { id: string; title: string; url?: string };
export type Nomination = { id: string; title: string; candidates: Candidate[] };

export const ballot: Nomination[] = [
  {
    id: "clip_of_year",
    title: "Клип года",
    candidates: [
      { id: "clip_1", title: "Клип #1", url: "https://example.com" },
      { id: "clip_2", title: "Клип #2", url: "https://example.com" },
    ],
  },
  {
    id: "streamer_of_year",
    title: "Стример года",
    candidates: [
      { id: "s1", title: "Streamer One" },
      { id: "s2", title: "Streamer Two" },
    ],
  },
];
