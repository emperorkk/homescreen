import { el } from "../util/dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();

function notify(): void {
  for (const fn of listeners) fn(deferred !== null);
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  notify();
});

export function renderInstallChip(): { node: HTMLElement; dispose: () => void } {
  const chip = el(
    "button",
    {
      class: "chip install-chip",
      type: "button",
      hidden: true,
      onclick: async () => {
        if (!deferred) return;
        try {
          await deferred.prompt();
          await deferred.userChoice;
        } catch {
          /* ignore */
        }
        deferred = null;
        notify();
      },
    },
    ["⤓ Εγκατάσταση"],
  );

  function update(canInstall: boolean): void {
    chip.hidden = !canInstall;
  }
  listeners.add(update);
  update(deferred !== null);

  return {
    node: chip,
    dispose() {
      listeners.delete(update);
    },
  };
}
