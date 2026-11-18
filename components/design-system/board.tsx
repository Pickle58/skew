import type { ReactNode } from "react";
import {
  Bell,
  Bookmark,
  Calendar,
  ChartColumn,
  CircleCheck,
  Clock,
  Ellipsis,
  ExternalLink,
  Info,
  Menu,
  Search,
  SlidersHorizontal,
  Tag,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { Wordmark } from "@/components/brand/wordmark";
import { BiasMeter } from "@/components/ui/bias-meter";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const typeRows = [
  ["H1", "Page / Screen Title", "32px", "Bold", "1.2"],
  ["H2", "Section Title", "24px", "Semibold", "1.3"],
  ["H3", "Card / Module Title", "20px", "Semibold", "1.3"],
  ["H4", "Subheading", "16px", "Medium", "1.4"],
  ["Body Large", "Important content", "16px", "Regular", "1.6"],
  ["Body Medium", "Body text", "14px", "Regular", "1.6"],
  ["Body Small", "Supporting text", "13px", "Regular", "1.6"],
  ["Caption", "Labels, meta text", "11px", "Regular", "1.4"],
] as const;

const swatches = [
  {
    label: "Primary",
    colors: [
      ["Text primary", "#00000F", "bg-ink"],
      ["Text secondary", "#68728D", "bg-muted"],
      ["Surface", "#F6F6F6", "bg-surface"],
    ],
  },
  {
    label: "Semantic",
    colors: [
      ["Left bias", "#B42318", "bg-bias-left"],
      ["Center", "#E5E7EB", "bg-bias-center"],
      ["Right bias", "#1D4ED8", "bg-bias-right"],
    ],
  },
  {
    label: "Neutrals",
    colors: [
      ["Bg primary", "#FFFFFF", "bg-panel"],
      ["Bg secondary", "#F0F0F0", "bg-panel-muted"],
      ["Border", "#E5E7EB", "bg-line"],
      ["Divider", "#E5E7EB", "bg-line"],
    ],
  },
] as const;

const icons: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Menu, label: "Menu" },
  { icon: Search, label: "Search" },
  { icon: Bookmark, label: "Bookmark" },
  { icon: Clock, label: "Clock" },
  { icon: Info, label: "Information" },
  { icon: Upload, label: "Upload" },
  { icon: ExternalLink, label: "External link" },
  { icon: Calendar, label: "Calendar" },
  { icon: ChartColumn, label: "Bar chart" },
  { icon: Tag, label: "Tag" },
  { icon: User, label: "User" },
  { icon: Bell, label: "Notifications" },
  { icon: SlidersHorizontal, label: "Sliders" },
  { icon: CircleCheck, label: "Check" },
  { icon: Ellipsis, label: "More" },
];

const spacing = [4, 8, 16, 24, 32, 40, 64] as const;

const shadows = [
  ["Small", "shadow-sm", "0px 1px 2px rgba(0,0,0,0.05)"],
  ["Medium", "shadow-md", "0px 4px 12px rgba(0,0,0,0.08)"],
  ["Large", "shadow-lg", "0px 12px 24px rgba(0,0,0,0.12)"],
] as const;

const radii = [
  ["Small", "4px", "rounded-sm"],
  ["Medium", "8px", "rounded-md"],
  ["Large", "12px", "rounded-lg"],
  ["Full", "9999px", "rounded-full"],
] as const;

const buttonColumns = ["Default", "Hover", "Outline", "Disabled"] as const;
const buttonRows = ["Primary", "Secondary", "Text"] as const;

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex h-full min-w-0 flex-col rounded-lg border border-line bg-panel p-5 ${className}`}>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{title}</h2>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

function ButtonMatrix() {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2 text-left">
        <caption className="mb-2 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Buttons
        </caption>
        <thead>
          <tr className="text-[11px] leading-[1.4] text-muted">
            <th className="w-20 pr-2 font-medium" scope="col">
              <span className="sr-only">Variant</span>
            </th>
            {buttonColumns.map((column) => (
              <th key={column} className="px-1 text-center font-medium" scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buttonRows.map((row) => (
            <tr key={row}>
              <th className="pr-2 text-[13px] font-medium text-ink" scope="row">
                {row}
              </th>
              {buttonColumns.map((column) => (
                <td key={column} className="px-1 text-center">
                  <ButtonCell row={row} column={column} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ButtonCell({
  row,
  column,
}: {
  row: (typeof buttonRows)[number];
  column: (typeof buttonColumns)[number];
}) {
  if (row === "Text" && (column === "Outline" || column === "Disabled")) {
    return <span className="text-[13px] text-muted">—</span>;
  }

  const variant = row === "Primary" ? "primary" : row === "Secondary" ? "secondary" : "text";

  if (column === "Disabled") {
    return (
      <Button variant={variant} disabled>
        Button
      </Button>
    );
  }

  if (column === "Outline") {
    return (
      <Button variant={variant} appearance="outline">
        Button
      </Button>
    );
  }

  if (column === "Hover") {
    return (
      <Button variant={variant} presentation="hover">
        Button
      </Button>
    );
  }

  return <Button variant={variant}>Button</Button>;
}

function Swatch({
  name,
  hex,
  className,
}: {
  name: string;
  hex: string;
  className: string;
}) {
  return (
    <figure className="min-w-0">
      <div className={`aspect-square w-full max-w-14 rounded-md border border-line ${className}`} />
      <figcaption className="mt-2 text-[11px] leading-[1.4] break-words text-muted">
        <span className="block uppercase tracking-[0.04em]">{name}</span>
        <span className="block">{hex}</span>
      </figcaption>
    </figure>
  );
}

export function DesignSystemBoard() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="grid min-w-0 gap-4 min-[1200px]:grid-cols-[248px_minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel title="Brand">
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-6 text-center">
            <Wordmark />
            <p className="mt-4 text-[14px] leading-[1.6] text-muted">
              Balanced news coverage,
              <br />
              powered by AI.
            </p>
          </div>
        </Panel>

        <Panel title="Typography">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-[32px] font-bold leading-[1.2] text-ink">Poppins</p>
              <p className="max-w-[16rem] text-[13px] leading-[1.6] text-muted">
                Poppins is a modern geometric sans-serif typeface that ensures clarity and excellent
                readability.
              </p>
            </div>
            <ul className="mt-4 divide-y divide-line min-[720px]:hidden">
              {typeRows.map((row) => (
                <li key={row[0]} className="py-2">
                  <p className="text-[13px] leading-[1.6]">
                    <span className="font-semibold text-ink">{row[0]}</span>
                    <span className="text-muted"> {row[1]}</span>
                  </p>
                  <p className="text-[13px] leading-[1.6] text-muted">
                    {row[2]} · {row[3]} · {row[4]}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden min-w-0 min-[720px]:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-muted">
                    <th className="pb-2 pr-3 font-medium" scope="col">
                      Style
                    </th>
                    <th className="pb-2 pr-3 font-medium" scope="col">
                      <span className="sr-only">Role</span>
                    </th>
                    <th className="pb-2 pr-3 font-medium" scope="col">
                      Size
                    </th>
                    <th className="pb-2 pr-3 font-medium" scope="col">
                      Weight
                    </th>
                    <th className="pb-2 font-medium" scope="col">
                      Line height
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((row) => (
                    <tr key={row[0]} className="text-[13px] leading-[1.6]">
                      <th className="py-0.5 pr-3 font-semibold text-ink" scope="row">
                        {row[0]}
                      </th>
                      <td className="py-0.5 pr-3 text-muted">{row[1]}</td>
                      <td className="py-0.5 pr-3 tabular-nums text-muted">{row[2]}</td>
                      <td className="py-0.5 pr-3 text-muted">{row[3]}</td>
                      <td className="py-0.5 tabular-nums text-muted">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        <Panel title="UI elements">
          <ButtonMatrix />
          <div className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Chip / category
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label="World Cup" />
              <Chip label="IPL" />
              <Chip label="Business & Markets" />
              <Chip label="More" />
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Bias meter
            </h3>
            <div className="mt-3">
              <BiasMeter left={25} center={50} right={25} showScale />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid min-w-0 gap-4 min-[1200px]:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.15fr)]">
        <Panel title="Colors">
          <div className="space-y-5">
            {swatches.map((group) => (
              <div key={group.label}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  {group.label}
                </h3>
                <div
                  className={`mt-3 grid gap-3 ${group.colors.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
                >
                  {group.colors.map((color) => (
                    <Swatch key={color[0]} name={color[0]} hex={color[1]} className={color[2]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Icons">
          <ul className="grid grid-cols-5 gap-y-5">
            {icons.map(({ icon: Icon, label }) => (
              <li key={label} className="flex justify-center">
                <Icon className="size-[22px] text-ink" strokeWidth={2} aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] leading-[1.6] text-muted">
            Line style · 2px stroke · Rounded caps
          </p>
        </Panel>

        <Panel title="Card example">
          <article className="flex flex-col gap-4 min-[720px]:flex-row">
            <div className="relative w-full shrink-0 min-[720px]:w-[132px]">
              <Image
                src="/design-system/card-photo.jpg"
                alt="Donald Trump in a dark suit and red tie, with an American flag behind him."
                width={132}
                height={108}
                className="h-[168px] w-full rounded-lg object-cover min-[720px]:h-[108px] min-[720px]:w-[132px]"
              />
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-panel text-ink shadow-sm">
                <Info className="size-3" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-[1.4] text-muted">Politics · United States</p>
              <h3 className="mt-1 text-[20px] font-semibold leading-[1.3] text-ink">
                Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report
              </h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-muted">
                The proposal includes stricter limits on uranium enrichment and enhanced verification
                measures.
              </p>
              <div className="mt-3">
                <BiasMeter left={25} center={50} right={49} size="card" />
              </div>
              <p className="mt-2 flex flex-wrap gap-4 text-[11px] leading-[1.4] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" strokeWidth={2} aria-hidden="true" />
                  2h ago
                </span>
                <span>12 min read</span>
              </p>
            </div>
          </article>
        </Panel>
      </div>

      <div className="grid min-w-0 gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.72fr)_minmax(0,0.72fr)]">
        <Panel title="Spacing system">
          <p className="-mt-3 text-[11px] leading-[1.4] text-muted">(4px base unit)</p>
          <div className="mt-6 flex items-end justify-between gap-2">
            {spacing.map((step) => (
              <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="w-full max-w-8 rounded-t-sm bg-diagram" style={{ height: step }} />
                <span className="text-[11px] leading-[1.4] text-muted">{step}px</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-[1.6] text-muted">
            Consistent spacing scale based on 4px base unit
          </p>
        </Panel>

        <Panel title="Grid system">
          <div className="flex flex-col gap-4 min-[700px]:flex-row min-[700px]:items-end">
            <div className="flex h-16 flex-1 items-end gap-1" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="h-full flex-1 rounded-t-sm bg-diagram" />
              ))}
            </div>
            <dl className="shrink-0 text-[11px] leading-[1.5] text-muted">
              <div>
                <dt className="sr-only">Container</dt>
                <dd>Container 1280px</dd>
              </div>
              <div>
                <dt className="sr-only">Columns</dt>
                <dd>Columns 12</dd>
              </div>
              <div>
                <dt className="sr-only">Gutter</dt>
                <dd>Gutter 24px</dd>
              </div>
              <div>
                <dt className="sr-only">Margin</dt>
                <dd>Margin 24px</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Shadows">
          <ul className="space-y-4">
            {shadows.map(([name, shadow, formula]) => (
              <li key={name} className="flex items-center gap-3">
                <div className={`size-14 shrink-0 rounded-md border border-line bg-panel ${shadow}`} />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink">{name}</p>
                  <p className="text-[11px] leading-[1.4] text-muted">{formula}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Border radius">
          <ul className="grid grid-cols-2 gap-4">
            {radii.map(([name, value, radius]) => (
              <li key={name}>
                <div className={`size-14 border border-line bg-panel ${radius}`} />
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink">{name}</p>
                <p className="text-[11px] leading-[1.4] text-muted">{value}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <footer className="rounded-lg bg-ink px-6 py-5 text-footer-muted">
        <div className="flex flex-col gap-5 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Wordmark tone="inverse" size="footer" />
            <p className="max-w-[12rem] text-[13px] leading-[1.4]">
              Balanced news coverage,
              <br />
              powered by AI.
            </p>
          </div>
          <p className="flex flex-wrap gap-6 text-[11px] leading-[1.4]">
            <span>Design System v1.0</span>
            <span>June 1, 2026</span>
          </p>
          <p className="text-[13px] leading-[1.4]">Stay consistent. Stay unbiased.</p>
        </div>
      </footer>
    </div>
  );
}
