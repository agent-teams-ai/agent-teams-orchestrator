export function forceUserId(value: unknown): string {
  return value as string;
}

export function normalizeLabel(label: string | undefined): string {
  return label || "untitled";
}
