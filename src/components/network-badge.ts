import { el } from "../util/dom";

interface NetConn {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  addEventListener?: (event: string, fn: () => void) => void;
  removeEventListener?: (event: string, fn: () => void) => void;
}

function getConn(): NetConn | undefined {
  const n = navigator as Navigator & {
    connection?: NetConn;
    mozConnection?: NetConn;
    webkitConnection?: NetConn;
  };
  return n.connection ?? n.mozConnection ?? n.webkitConnection;
}

function format(): { online: boolean; label: string } {
  const online = navigator.onLine;
  if (!online) return { online: false, label: "OFFLINE" };
  const conn = getConn();
  const t = conn?.type;
  const eff = conn?.effectiveType?.toUpperCase();
  if (t === "wifi") return { online: true, label: "WI-FI" };
  if (t === "ethernet") return { online: true, label: "ETHERNET" };
  if (t === "cellular" && eff) return { online: true, label: eff };
  if (eff) return { online: true, label: eff };
  return { online: true, label: "ONLINE" };
}

export function renderNetworkBadge(): { node: HTMLElement; dispose: () => void } {
  const dot = el("span", { class: "dot" });
  const text = el("span", { class: "label" }, ["…"]);
  const node = el("div", { class: "network-badge", role: "status" }, [dot, text]);

  function update() {
    const { online, label } = format();
    node.dataset.online = String(online);
    text.textContent = label;
  }
  update();

  const conn = getConn();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  conn?.addEventListener?.("change", update);

  return {
    node,
    dispose() {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener?.("change", update);
    },
  };
}
