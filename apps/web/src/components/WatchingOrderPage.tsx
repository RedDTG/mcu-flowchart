import { AppNavbar } from "./AppNavbar";

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "Quel est le meilleur ordre pour débuter Marvel ?",
    answer:
      "Si tu débutes, l’ordre de sortie est le plus simple : il évite les spoilers involontaires et respecte la manière dont les révélations ont été pensées.",
  },
  {
    question: "Ordre chronologique ou ordre de sortie : que choisir ?",
    answer:
      "L’ordre chronologique peut être fun en rewatch, mais l’ordre de sortie reste le plus fluide pour une première découverte. Tu gardes mieux le rythme des enjeux et des post-génériques.",
  },
  {
    question: "Dois-je tout regarder pour comprendre l’essentiel ?",
    answer:
      "Non. Tu peux suivre un parcours \"core\" avec les films d’équipe, les films d’introduction majeurs et quelques séries clés. Le reste peut être vu comme du bonus selon tes personnages préférés.",
  },
  {
    question: "Comment éviter la fatigue sur un long marathon ?",
    answer:
      "Alterne films et séries, limite-toi à 1 ou 2 contenus par session, et fais des pauses entre les grosses sagas. Une progression régulière vaut mieux qu’un sprint.",
  },
  {
    question: "Les scènes post-génériques sont-elles importantes ?",
    answer:
      "Souvent oui. Elles servent de passerelle entre les œuvres et posent des intrigues futures. Si tu suis l’ordre de sortie, elles prennent tout leur sens.",
  },
  {
    question: "Puis-je regarder seulement les films ?",
    answer:
      "Oui, mais certaines séries ajoutent du contexte utile pour les phases récentes. Si tu veux une compréhension complète, ajoute au moins les séries les plus liées aux films que tu vises.",
  },
  {
    question: "Quelle méthode simple pour construire mon ordre perso ?",
    answer:
      "Choisis une base (sortie), puis applique des filtres : personnages favoris, disponibilité plateforme, et temps hebdomadaire. Garde une liste courte et ajustable.",
  },
  {
    question: "Comment gérer les univers parallèles (Sony, Fox, etc.) ?",
    answer:
      "Traite-les comme des branches annexes : regarde-les quand ils enrichissent directement un film MCU que tu prépares, sinon garde-les en bonus.",
  },
];

export function WatchingOrderPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-black via-zinc-950 to-black text-zinc-100">
      <AppNavbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Watching Order</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">FAQ pour regarder Marvel sans se perdre</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300 sm:text-base">
            Cette page te donne des réponses rapides et pratiques pour construire ton ordre de visionnage.
            L’objectif : rester simple, éviter les spoilers, et garder un rythme agréable.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-white">{item.question}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300 sm:text-base">{item.answer}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
