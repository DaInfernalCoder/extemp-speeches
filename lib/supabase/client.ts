import { createBrowserClient } from '@supabase/ssr';

// Ensure we reuse a single browser client instance across renders.
// Creating a new client on every render causes effects that depend on it
// to re-run continuously (e.g., re-subscribing to channels and refetching).
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

