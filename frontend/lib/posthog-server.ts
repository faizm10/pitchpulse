import { PostHog } from 'posthog-node';

const POSTHOG_API_HOST =
  process.env.POSTHOG_API_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!client) {
    client = new PostHog(key, {
      host: POSTHOG_API_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  await client.shutdown();
  client = null;
}
