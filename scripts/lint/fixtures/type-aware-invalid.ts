export async function abandonWork(): Promise<void> {
  Promise.resolve("ignored");
}

void abandonWork();
