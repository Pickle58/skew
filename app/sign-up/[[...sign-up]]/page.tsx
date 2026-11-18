import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpTracker } from "@/components/auth/sign-up-tracker";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUpTracker />
      <SignUp />
    </AuthShell>
  );
}
