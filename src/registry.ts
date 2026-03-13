import type { AdapterMatchResult, WebAdapterTargetContext, WebPageAdapter } from "./contracts.js";

export type WebAdapterSelection = {
  adapter: WebPageAdapter;
  match: AdapterMatchResult;
};

export class WebAdapterRegistry {
  private readonly adapters: WebPageAdapter[] = [];

  register(adapter: WebPageAdapter): void {
    const existing = this.adapters.find((item) => item.id === adapter.id);
    if (existing) {
      throw new Error(`adapter_already_registered:${adapter.id}`);
    }
    this.adapters.push(adapter);
  }

  list(): readonly WebPageAdapter[] {
    return this.adapters;
  }

  async selectBestMatch(target: WebAdapterTargetContext): Promise<WebAdapterSelection | null> {
    const matches = await Promise.all(
      this.adapters.map(async (adapter) => ({
        adapter,
        match: await adapter.match(target),
      })),
    );

    const eligible = matches
      .filter((entry) => entry.match.matched)
      .sort((left, right) => right.match.confidence - left.match.confidence);

    return eligible[0] ?? null;
  }
}
