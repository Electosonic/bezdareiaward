export type Candidate = { id: string; title: string; image?: string };
export type Nomination = { id: string; title: string; candidates: Candidate[] };

export const ballot: Nomination[] = [
  {
    id: "zavoz_goda",
    title: "Завоз года — кандидаты",
    candidates: [
      { id: "iris", title: "Браки в Ирисе" },
      { id: "sab", title: "Веном в САБчате",},
      { id: "blur", title: "Блюр Лизы в фильме", },
      { id: "tulpa", title: '"Тульпа" Вики', },
    ],
  },
];
