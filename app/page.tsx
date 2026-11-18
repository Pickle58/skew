import { Suspense } from "react";
import { NewsFeed } from "@/components/home/news-feed";
import { NewsFeedSkeleton } from "@/components/home/news-feed-skeleton";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pt-6">
        <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">Top News</h1>
        <Suspense fallback={<NewsFeedSkeleton />}>
          <NewsFeed />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
