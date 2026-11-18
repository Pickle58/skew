import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function NewsNotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader showTopics={false} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-16">
        <h1 className="text-[32px] font-bold leading-[1.2] text-ink">Story not found</h1>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-[1.6] text-ink">
          This story is not on Skew.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
