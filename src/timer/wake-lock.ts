interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (event: "release", handler: () => void) => void;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

let sentinel: WakeLockSentinelLike | null = null;

function getApi(): WakeLockLike | undefined {
  return (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
}

export async function acquireWakeLock(): Promise<void> {
  const wl = getApi();
  if (!wl) return;
  try {
    sentinel = await wl.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!sentinel || sentinel.released) {
    sentinel = null;
    return;
  }
  try {
    await sentinel.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
}

export function reacquireOnVisible(): () => void {
  const handler = () => {
    if (document.visibilityState === "visible" && !sentinel) {
      void acquireWakeLock();
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
