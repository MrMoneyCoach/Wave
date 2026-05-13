import type { RecapApi } from "../electron/preload";

declare global {
  interface Window {
    recap: RecapApi;
  }
}

export {};
