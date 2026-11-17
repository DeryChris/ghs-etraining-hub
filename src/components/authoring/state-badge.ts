export function materialStateBadge(state: string): "success" | "warn" | "outline" | "default" | "danger" {
  switch (state) {
    case "PUBLISHED":
      return "success";
    case "IN_REVIEW":
      return "warn";
    case "DRAFT":
      return "outline";
    case "ARCHIVED":
      return "danger";
    default:
      return "default";
  }
}
