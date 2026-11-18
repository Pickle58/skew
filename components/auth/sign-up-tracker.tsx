"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

export function PostHogUserIdentification() {
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const persistedUserId = posthog.get_property("$user_id");
    const currentUserId =
      identifiedUserId.current ?? (typeof persistedUserId === "string" ? persistedUserId : null);

    if (!user) {
      if (currentUserId) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    if (currentUserId === user.id) {
      identifiedUserId.current = user.id;
      return;
    }

    if (currentUserId) {
      posthog.reset();
    }

    const email = user.primaryEmailAddress?.emailAddress;

    posthog.identify(user.id, {
      ...(email ? { email } : {}),
      ...(user.fullName ? { name: user.fullName } : {}),
    });
    identifiedUserId.current = user.id;
  }, [isLoaded, user]);

  return null;
}

export function SignUpTracker() {
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) {
      return;
    }
    captured.current = true;
    posthog.capture("sign_up_started");
  }, []);

  return null;
}
