/** Join optional CSS class names without adding a runtime dependency. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
