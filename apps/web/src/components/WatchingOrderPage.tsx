import Link from "next/link";
import { AppNavbar } from "./AppNavbar";

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "What is the best order to watch Marvel movies and series?",
    answer:
      "Release order.\n\nNo, seriously, if you're new to the MCU and want to discover the whole thing, stick to the release order. It preserves the intended narrative flow, character introductions, and post-credit scenes. You can find the release order on our Explore page.",
  },
  {
    question: "Why does every other website recommend the chronological order then ?",
    answer:
      "Honestly, we're asking ourselves the same question. Chronological order should never be an option for a newcomer and it applies to any franchise, not just Marvel.",
  },
  {
    question: "What about the other universes (Sony, Fox, etc.)?",
    answer:
      "For universes outside the MCU, except direct sequels, the connections are more abstract. Just go with the flow and watch what you're interested in or linked to the movies or shows you want to watch. There are many standalone stories or optional connections so feel free to go bit by bit.",
  },
  {
    question: "Should I watch everything?",
    answer:
      "Well... yes, but no. But also yes ? It mostly depends on how you want to invest in this universe. If you don't watch the \"required\" connections you'll surely miss a significant part of the plot or character development, but if you don't mind, just go ahead ! You can also grab one of those nerdy friends of yours and let them enjoy explaining in details what you missed.\n\nWe're currently working on a feature that recaps, point by point, what you need to know before watching any movie or show, so stay tuned for that !",
  },
  {
    question: "Are post-credit scenes really important?",
    answer:
      "Mostly yes, but think of them more as teasers or small links between movies and shows than a crucial part of the plot. Lately, post-credits scenes have become less consistent and introduces plots, concepts and characters that never even appear in any other media.",
  },
  {
    question: "Should I watch the series if I only care about the movies?",
    answer:
      "Well again, it depends on how much you want to invest in the universe. We'll recommend you to watch the shows that features your favorites characters or plotlines since they are not that long (around 8 episodes each). Still, if you don't really care and are okay with missing some parts of the context, you can skip them and just watch the movies but be aware that you might not understand some important part of the plot or character development. ",
  },
  {
    question: "One media is missing or there is a mistake / I disagree with one or more of the relations between medias, how can I report that?",
    answer:
      "This universe is massive, and we certainly don't have perfect knowledge of everything. If you see something missing or wrong, please report it to us by opening an issue on the GitHub repository that you can find below on the footer of this website.",
  }
];

export function WatchingOrderPage() {
  const renderAnswer = (answer: string) => {
    const exploreWord = "Explore";
    const parts = answer.split(exploreWord);

    if (parts.length === 1) {
      return answer;
    }

    return parts.map((part, index) => (
      <span key={`${part}-${index}`}>
        {part}
        {index < parts.length - 1 ? (
          <Link href="/all-media" className="font-semibold text-red-300 underline decoration-red-400/70 underline-offset-2 hover:text-red-200">
            {exploreWord}
          </Link>
        ) : null}
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-zinc-950 to-black text-zinc-100">
      <AppNavbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-8 md:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-4 text-center sm:mx-0 sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Watching order and Q&A</p>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">Now, that's the real question.</h1>
            <p className="text-zinc-300">
              Every Marvel fan, from complete beginners to hardcore nerds has asked themselves this question : what is the best order to watch Marvel movies and series ? And since every website seems to have its own opinion, it can be very confusing. So here we'll answer all your questions.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {faqItems.map((item, index) => (
            <article
              key={item.question}
              className={index === 0
                ? "relative overflow-hidden rounded-3xl border border-red-500/25 bg-linear-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-6"
                : "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6"}
            >
              {index === 0 ? (
                <>
                  <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-rose-500/10 blur-3xl" />
                </>
              ) : null}

              <div className={index === 0 ? "relative z-10" : undefined}>
              <h2 className="text-lg font-bold text-white">{item.question}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-300 sm:text-base">{renderAnswer(item.answer)}</p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
