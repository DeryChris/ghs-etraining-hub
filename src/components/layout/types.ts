import type { Role } from "@/lib/rbac/capabilities";

/** Serialisable identity passed from the server layout to client shell components. */
export interface ShellUser {
  name: string;
  role: Role;
  staffId: string;
  /** Facilitators who also sign off the review queue for their programme fields. */
  unitHead?: boolean;
}
