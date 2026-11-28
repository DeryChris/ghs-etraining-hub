"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FolderTree,
  Headset,
  Library,
  LogIn,
  Search,
  ShieldCheck,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  filterHelpFaqs,
  HELP_FAQ_CATEGORIES,
  type HelpFaqIcon,
  type HelpFaqItem,
} from "@/lib/help-faq";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<HelpFaqIcon, LucideIcon> = {
  library: Library,
  "user-plus": UserPlus,
  "book-open": BookOpen,
  "clipboard-check": ClipboardCheck,
  "shield-check": ShieldCheck,
};

const CATEGORY_TONES: Record<HelpFaqIcon, string> = {
  library: "bg-ghs-green/10 text-ghs-green",
  "user-plus": "bg-ghs-red/10 text-ghs-red",
  "book-open": "bg-primary/10 text-primary",
  "clipboard-check": "bg-ghs-gold/35 text-ghs-green",
  "shield-check": "bg-ghs-red/10 text-ghs-red",
};

const QUICK_ACCESS: {
  href: string;
  title: string;
  description: string;
  action: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    href: "/login",
    title: "Sign in",
    description: "Access your account and the training records available to you.",
    action: "Sign in",
    icon: LogIn,
    tone: "bg-ghs-green/10 text-ghs-green",
  },
  {
    href: "/register",
    title: "Create an account",
    description: "Register with an active, unclaimed GHS Staff ID record.",
    action: "Create an account",
    icon: UserPlus,
    tone: "bg-ghs-red/10 text-ghs-red",
  },
  {
    href: "/programmes",
    title: "Browse Programme Areas",
    description: "Explore Programme Areas and the Programme Fields within them.",
    action: "Explore programmes",
    icon: FolderTree,
    tone: "bg-ghs-gold/35 text-ghs-green",
  },
  {
    href: "/contact",
    title: "Contact support",
    description: "Find the right support route when you need another way to reach us.",
    action: "Contact and Support",
    icon: Headset,
    tone: "bg-primary/10 text-primary",
  },
];

function FaqItem({
  item,
  expanded,
  onToggle,
}: {
  item: HelpFaqItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const triggerId = `faq-trigger-${item.id}`;
  const panelId = `faq-panel-${item.id}`;

  return (
    <article className="border-t border-hairline first:border-t-0">
      <h5>
        <button
          id={triggerId}
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex min-h-14 w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-semibold leading-snug text-ink transition-colors hover:bg-surface-2/70 motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-5 sm:text-base"
        >
          <span>{item.question}</span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-primary transition-transform duration-200 motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h5>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 px-4 pb-5 text-sm leading-relaxed text-ink-muted sm:px-5 sm:text-[15px]">
            <p>{item.answer}</p>
            {item.links && item.links.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {item.links.map((link) => (
                  <li key={`${item.id}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {link.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function HelpCentre() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => filterHelpFaqs({ query, categoryId }),
    [query, categoryId],
  );
  const queryCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of filterHelpFaqs({ query })) counts.set(category.id, category.items.length);
    return counts;
  }, [query]);
  const resultCount = visibleCategories.reduce((total, category) => total + category.items.length, 0);

  function updateQuery(value: string) {
    setQuery(value);
    setCategoryId("all");
    setExpandedId(null);
  }

  function selectCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setExpandedId(null);
  }

  function toggleQuestion(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <section aria-labelledby="help-centre-title" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <CircleHelp className="h-4 w-4" aria-hidden />
          Help Centre
        </p>
        <h2 id="help-centre-title" className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          Find answers and learn how to use the Library.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
          Search guidance about registration, Programme Areas, training records, attached files and account access.
        </p>
      </div>

      <div role="search" className="relative mt-7 max-w-3xl">
        <label htmlFor={searchId} className="sr-only">
          Search help questions and answers
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          id={searchId}
          aria-controls="faq-results"
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search for an answer or describe your issue..."
          className="h-14 w-full rounded-[var(--radius-pill)] border border-hairline bg-surface px-12 pr-14 text-base text-ink shadow-panel placeholder:text-ink-muted/75 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => updateQuery("")}
            aria-label="Clear help search"
            className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <section aria-labelledby="quick-access-title" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ghs-red">Quick access</p>
            <h3 id="quick-access-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink">
              Frequently needed actions
            </h3>
          </div>
          <p className="text-sm text-ink-muted">Shortcuts for the next step.</p>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACCESS.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="group flex h-full min-h-52 flex-col rounded-card border border-hairline bg-surface p-5 shadow-panel transition-[border-color,transform] duration-fast motion-safe:hover:-translate-y-0.5 hover:border-primary/45 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-control", action.tone)}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="mt-4 text-base font-bold text-ink">{action.title}</span>
                  <span className="mt-1 text-sm leading-relaxed text-ink-muted">{action.description}</span>
                  <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-sm font-semibold text-primary">
                    {action.action}
                    <ArrowRight className="h-4 w-4 transition-transform duration-fast motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="mt-16 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ghs-green">Answers and guidance</p>
            <h3 id="faq-title" className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              Frequently asked questions
            </h3>
          </div>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {query.trim() ? `${resultCount} matching ${resultCount === 1 ? "answer" : "answers"}` : `${resultCount} questions`}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
          <nav aria-label="FAQ categories" className="lg:sticky lg:top-24">
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Browse by topic</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <CategoryButton
                active={categoryId === "all"}
                count={HELP_FAQ_CATEGORIES.reduce((sum, category) => sum + (queryCategoryCounts.get(category.id) ?? 0), 0)}
                label="All questions"
                onClick={() => selectCategory("all")}
              />
              {HELP_FAQ_CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICONS[category.icon];
                return (
                  <CategoryButton
                    key={category.id}
                    active={categoryId === category.id}
                    count={queryCategoryCounts.get(category.id) ?? 0}
                    icon={<Icon className="h-4 w-4 shrink-0" aria-hidden />}
                    label={category.title}
                    onClick={() => selectCategory(category.id)}
                  />
                );
              })}
            </div>
          </nav>

          <div id="faq-results" className="min-w-0 space-y-7">
            {visibleCategories.length > 0 ? (
              visibleCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.icon];
                return (
                  <section key={category.id} aria-labelledby={`faq-category-${category.id}`}>
                    <div className="mb-3 flex items-start gap-3">
                      <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-control", CATEGORY_TONES[category.icon])}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h4 id={`faq-category-${category.id}`} className="text-lg font-extrabold tracking-tight text-ink">
                          {category.title}
                        </h4>
                        <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{category.description}</p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-panel">
                      {category.items.map((item) => (
                        <FaqItem
                          key={item.id}
                          item={item}
                          expanded={expandedId === item.id}
                          onToggle={() => toggleQuestion(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="rounded-card border border-dashed border-hairline bg-surface p-6 sm:p-8">
                <p className="text-base font-bold text-ink">No matching answers found.</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                  Try another keyword or report your issue through the Complaint Hub.
                </p>
                <Link
                  href="/help/report"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-ghs-red px-5 text-sm font-bold text-white transition-colors hover:brightness-95 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ghs-red"
                >
                  Report an issue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function CategoryButton({
  active,
  count,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-control px-3 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "bg-primary text-primary-ink"
          : "border border-hairline bg-surface text-ink-muted hover:border-primary/35 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 break-words">{label}</span>
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums", active ? "bg-primary-ink/15" : "bg-surface-2 text-ink-muted")}>
        {count}
      </span>
    </button>
  );
}
