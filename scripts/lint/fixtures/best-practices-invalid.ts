export function omitOddValues(values: number[]): Array<number | undefined> {
  return values.map((value) => {
    if (value % 2 === 0) {
      return value;
    }
  });
}

export function unsafeOwnershipCheck(
  record: Record<string, unknown>,
): boolean {
  return record.hasOwnProperty("value");
}

export function indexLabels(labels: string[]): Record<string, true> {
  return labels.reduce(
    (index, label) => ({
      ...index,
      [label]: true,
    }),
    {},
  );
}

void new Promise<void>((resolve) => {
  return resolve();
});

// @ts-ignore
export const ignoredTypeError: string = 42;
