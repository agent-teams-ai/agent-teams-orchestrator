export async function observeWork(): Promise<void> {
  await Promise.resolve("observed");
}

void observeWork();
