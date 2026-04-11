/**
 * Fallback universe when /api/stocks is unavailable (offline, misconfig, etc.).
 */

import type { StockMatchRow } from "@/lib/stock-search-rank";

export const MOCK_STOCK_HITS: StockMatchRow[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Technology" },
  { symbol: "INFY", name: "Infosys", sector: "Technology" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Communication" },
  { symbol: "ITC", name: "ITC", sector: "Consumer" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Industrial" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Materials" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Consumer" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer" },
];
