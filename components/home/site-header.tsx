"use client";

import { useState } from "react";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import posthog from "posthog-js";
import { Menu } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

const homeLinkClassName = "text-[14px] font-medium text-ink hover:text-bias-right";

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

function HomeLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className={homeLinkClassName} onClick={onNavigate}>
      Home
    </Link>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="mx-auto w-full max-w-[1280px] px-6 pt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-ink md:hidden"
          aria-expanded={menuOpen}
          aria-controls="section-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu className="size-5" strokeWidth={2} />
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
        <Link href="/" aria-label="Skew home" onClick={() => setMenuOpen(false)}>
          <Wordmark size="footer" />
        </Link>
        <nav aria-label="Sections" className="ml-5 hidden md:block">
          <HomeLink />
        </nav>
        <div className="ml-auto hidden md:block">
          <AuthControl />
        </div>
      </div>

      {menuOpen ? (
        <div id="section-menu" className="mt-3 flex flex-col items-start gap-3 md:hidden">
          <nav aria-label="Sections" className="flex flex-col items-start gap-2">
            <HomeLink onNavigate={() => setMenuOpen(false)} />
          </nav>
          <AuthControl />
        </div>
      ) : null}
    </header>
  );
}
