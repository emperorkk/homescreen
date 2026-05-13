interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsFetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
