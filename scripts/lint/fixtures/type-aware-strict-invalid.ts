export function forceUserId(value: unknown): string {
  return value as string;
}

export function normalizeLabel(label: string | undefined): string {
  return label || "untitled";
}

export type InvalidVoidUnion = string | void;

export function rejectWithString(): Promise<never> {
  return Promise.reject("failure");
}
