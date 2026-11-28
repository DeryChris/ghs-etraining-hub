import { SITE } from "@/lib/site";

export type HelpFaqIcon = "library" | "user-plus" | "book-open" | "clipboard-check" | "shield-check";

export interface HelpFaqLink {
  href: string;
  label: string;
}

export interface HelpFaqItem {
  id: string;
  question: string;
  answer: string;
  searchTerms?: readonly string[];
  links?: readonly HelpFaqLink[];
}

export interface HelpFaqCategory {
  id: string;
  title: string;
  description: string;
  icon: HelpFaqIcon;
  items: readonly HelpFaqItem[];
}

/**
 * Help copy follows the current training-first Library: a file belongs to a
 * Training Session, and the catalogue browses trainings rather than standalone
 * material/version pages.
 */
export const HELP_FAQ_CATEGORIES: readonly HelpFaqCategory[] = [
  {
    id: "about-library",
    title: "About the Training Library",
    description: "What the Library contains and how it is organised.",
    icon: "library",
    items: [
      {
        id: "what-is-library",
        question: "What is the Training Library?",
        answer:
          `The ${SITE.fullName} organises Training Session records and the files attached to them. Programme Areas are the parent categories, with Programme Fields inside them. Public pages show information made available for public browsing; signed-in access depends on your account and permissions.`,
      },
      {
        id: "who-can-use-library",
        question: "Who can use the Training Library?",
        answer:
          "Anyone can browse the publicly available Programme Areas, Programme Fields and training records. GHS staff can sign in with their Staff ID to use account features and open records or files their permissions allow.",
        links: [{ href: "/login", label: "Sign in" }],
      },
      {
        id: "when-available",
        question: "Are uploaded files available immediately?",
        answer:
          "Training Session records go through review before they are published. Pending or returned records are not listed for public browsing. Files are attached to a training record, rather than published as standalone catalogue items.",
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting Started and Registration",
    description: "Sign in, create an account and get your Staff ID recognised.",
    icon: "user-plus",
    items: [
      {
        id: "sign-in-or-register",
        question: "How do I sign in or set up an account?",
        answer:
          "If you already have an account, sign in with your GHS Staff ID and password. If you are new to the Library, choose Create an Account. Registration verifies an active, unclaimed record in the staff directory; it cannot create a missing staff record. Report a missing or incorrect record through the Complaint Hub.",
        links: [
          { href: "/login", label: "Sign in" },
          { href: "/register", label: "Create an account" },
          { href: "/help/report", label: "Report a staff-record issue" },
        ],
      },
      {
        id: "staff-id-not-recognised",
        question: "What if my Staff ID is not recognised?",
        answer:
          "Your Staff ID must match an eligible record in the staff directory. If the record is missing, incorrect or cannot be verified, report the problem through the Complaint Hub so it can be reviewed.",
        searchTerms: ["missing staff record", "unrecognised staff ID", "unrecognized staff ID"],
        links: [{ href: "/help/report", label: "Report an issue" }],
      },
      {
        id: "register-every-time",
        question: "Do I need to create an account every time I use the Library?",
        answer:
          "No. Once your account is set up, sign in with your registered GHS Staff ID and password whenever you need account-based access.",
      },
    ],
  },
  {
    id: "finding-trainings",
    title: "Finding Trainings and Files",
    description: "Browse the Programme Areas and open the files attached to a training.",
    icon: "book-open",
    items: [
      {
        id: "navigate-programmes",
        question: "How do I navigate Programme Areas and Programme Fields?",
        answer:
          "Open Programme Areas to see the parent categories. Choose a Programme Area to view its Programme Fields, then open a field to see the trainings listed under it. Breadcrumbs show where you are in the hierarchy.",
        links: [{ href: "/programmes", label: "Browse Programme Areas" }],
      },
      {
        id: "find-a-training",
        question: "How do I find a training or its files?",
        answer:
          "Browse from a Programme Area to a Programme Field to see the training records available there. After signing in, the Trainings list can search by title and filter by Programme Area, Programme Field, year, place and status. Open a training record to see its attached files.",
        links: [
          { href: "/programmes", label: "Browse by programme" },
          { href: "/trainings", label: "Open Trainings" },
        ],
      },
      {
        id: "preview-download-files",
        question: "How do I preview or download an attached file?",
        answer:
          "After signing in, open the Training Session record and select one of its attached files. Supported formats can be previewed in the browser; use Download to save a copy to your device. Files are accessed from their training, not from a separate material page.",
        searchTerms: ["download materials", "download a document", "preview a file"],
      },
      {
        id: "cannot-see-training",
        question: "Why can’t I see a particular training or file?",
        answer:
          "A training may still be awaiting review, or your account may not have permission to open it. A file may not have been attached to the training. If you expected to see it, report the training title and file name through the Complaint Hub. Never include your password.",
        links: [{ href: "/help/report", label: "Report an access issue" }],
      },
    ],
  },
  {
    id: "review-and-files",
    title: "Review and Attached Files",
    description: "Understand training review states and what to do about an outdated file.",
    icon: "clipboard-check",
    items: [
      {
        id: "training-statuses",
        question: "What do the training and review statuses mean?",
        answer:
          "The training status describes the event: Planned, Held or Cancelled. Its review state is separate: Pending review means a unit head or administrator has not approved it yet; Live means it has been approved and published; Returned for correction means the author needs to address a reviewer’s note and resubmit it.",
      },
      {
        id: "older-file-version",
        question: "Can I open an older document version?",
        answer:
          "The current Library does not provide a separate reader-facing document version-history page. Files are attached directly to a Training Session. If you need an older file, or think an attachment is outdated or incorrect, report the training title and file name through the Complaint Hub.",
        searchTerms: ["document versions", "version history", "old version", "outdated file"],
        links: [{ href: "/help/report", label: "Report a file issue" }],
      },
      {
        id: "who-updates-files",
        question: "Who can update files attached to a training?",
        answer:
          "A facilitator or administrator with permission to manage that training can add or remove its files. If an attachment is missing, will not open or appears to be the wrong file, tell us which training it belongs to so the right person can review it.",
        links: [{ href: "/help/report", label: "Report a file issue" }],
      },
    ],
  },
  {
    id: "account-and-access",
    title: "Account and Access Problems",
    description: "Password help, sign-in problems, permissions and complaint follow-up.",
    icon: "shield-check",
    items: [
      {
        id: "forgot-password",
        question: "I forgot my password. What should I do?",
        answer:
          "The Library does not currently send automated password-reset emails. Ask your facility administrator or ICT helpdesk to issue a one-time reset link; it works once and expires after one hour. If you cannot reach them, report the access problem through the Complaint Hub.",
        links: [
          { href: "/forgot-password", label: "Password-reset instructions" },
          { href: "/help/report", label: "Report an access problem" },
        ],
      },
      {
        id: "locked-account",
        question: "My account is locked or I cannot sign in.",
        answer:
          "Report the problem through the Complaint Hub and describe the message you see. Do not include your password in a complaint or support request.",
        links: [{ href: "/help/report", label: "Report a sign-in problem" }],
      },
      {
        id: "missing-programme-access",
        question: "I can sign in, but I cannot see an expected Programme Area or training.",
        answer:
          "Access depends on the records and permissions assigned to your account. Report the Programme Area, Programme Field or training you expected to see, and the error or page you encountered.",
        links: [{ href: "/help/report", label: "Report an access issue" }],
      },
      {
        id: "check-complaint-status",
        question: "How do I check my complaint status?",
        answer:
          "Open the status page and enter the same Staff ID you provided with your complaint. You can see its status and any saved response, and add a follow-up message where that option is available.",
        links: [{ href: "/help/status", label: "Check complaint status" }],
      },
    ],
  },
] as const;

export interface HelpFaqFilter {
  query?: string;
  categoryId?: string;
}

/** Search actual question/answer copy and optionally narrow to one category. */
export function filterHelpFaqs({ query = "", categoryId = "all" }: HelpFaqFilter) {
  const needle = query.trim().toLocaleLowerCase("en");
  return HELP_FAQ_CATEGORIES.filter((category) => categoryId === "all" || category.id === categoryId)
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (!needle) return true;
        const searchable = [
          category.title,
          category.description,
          item.question,
          item.answer,
          ...(item.searchTerms ?? []),
          ...(item.links ?? []).map((link) => link.label),
        ]
          .join(" ")
          .toLocaleLowerCase("en");
        return searchable.includes(needle);
      }),
    }))
    .filter((category) => category.items.length > 0);
}
