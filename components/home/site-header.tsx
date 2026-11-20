"use client";

import { useRef, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import posthog from "posthog-js";
import { ChevronRight, Menu, Plus } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { topics } from "@/components/home/topics";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const navItems = ["Home"] as const;

function NavItems({ className }: { className?: string }) {
  return (
    <nav aria-label="Sections" className={className}>
      {navItems.map((item) => (
        <button
          key={item}
          type="button"
          aria-current={item === "Home" ? "page" : undefined}
          className="text-[14px] font-medium text-ink hover:text-bias-right"
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

const userButtonAppearance = {
  elements: { avatarBox: "size-9" },
};

function AuthControl() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton>
          <Button size="header" appearance="outline" onClick={() => posthog.capture("sign_in_started")}>
            Login
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={userButtonAppearance} />
      </Show>
    </>
  );
}

export function SiteHeader({ showTopics = true }: { showTopics?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const topicsRef = useRef<HTMLDivElement>(null);

  function showMoreTopics() {
    topicsRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  }

  return (
    <header className="mx-auto w-full max-w-[1280px] px-6 pt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-ink"
          aria-expanded={menuOpen}
          aria-controls="section-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu className="size-5" strokeWidth={2} />
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
        <Wordmark size="footer" />
        <NavItems className="ml-5 hidden items-center gap-5 md:flex" />
        <div className="ml-auto hidden md:flex">
          <AuthControl />
        </div>
      </div>

      {menuOpen ? (
        <div id="section-menu" className="mt-3 flex flex-col items-start gap-3 md:hidden">
          <NavItems className="flex flex-col items-start gap-2" />
          <AuthControl />
        </div>
      ) : null}

      {showTopics ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Add topic"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink"
          >
            <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <div
            ref={topicsRef}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {topics.map((topic) => (
              <span key={topic} className="shrink-0">
                <Chip
                  label={topic}
                  onClick={() =>
                    posthog.capture("topic_chip_clicked", {
                      topic,
                    })
                  }
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            aria-label="Show more topics"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink"
            onClick={showMoreTopics}
          >
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </header>
  );
}
