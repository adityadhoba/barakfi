/**
 * Display helpers for stocks — country label should follow exchange when DB
 * `country` was defaulted incorrectly (e.g. India for US listings).
 */
export function displayCountryForStock(exchange: string, country: string): string {
  const ex = (exchange || "").toUpperCase();
  if (ex === "NSE" || ex === "BSE") return "India";
  if (ex === "US" || ex === "NYSE" || ex === "NASDAQ") return "United States";
  if (ex === "LSE" || ex === "LON") return "United Kingdom";
  return country || "—";
}
