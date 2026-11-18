import { notFound } from "next/navigation";
import { DesignSystemBoard } from "@/components/design-system/board";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DesignSystemBoard />;
}
