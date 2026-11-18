import { connection } from "next/server";
import { NewsCard } from "@/components/home/news-card";
import { listArticleCards } from "@/lib/supabase/queries/articles";

const FEED_LIMIT = 30;

export async function NewsFeed() {
  await connection();
  const articles = await listArticleCards({ limit: FEED_LIMIT });

  if (articles.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-panel p-6">
        <p className="text-[16px] font-semibold leading-[1.4] text-ink">No stories yet</p>
        <p className="mt-1 text-[13px] leading-[1.6] text-muted">
          Analyzed articles appear here after the next update.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id} className="min-w-0">
          <NewsCard article={article} />
        </li>
      ))}
    </ul>
  );
}
