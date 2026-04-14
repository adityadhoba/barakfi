import { create } from "zustand";
import type { CheckStockResponse, MultiMethodologyResult, ScreeningResult, Stock } from "@/lib/api";

/** One full check payload: summary + details tables share this. */
export type CheckStockSessionPayload = {
  check: CheckStockResponse;
  stock: Stock;
  screening: ScreeningResult;
  multi: MultiMethodologyResult | null;
};

type State = {
  payload: CheckStockSessionPayload | null;
  setPayload: (p: CheckStockSessionPayload | null) => void;
};

export type CheckStockSessionState = State;

export const useCheckStockSession = create<State>((set) => ({
  payload: null,
  setPayload: (p) => set({ payload: p }),
}));
