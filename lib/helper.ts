export const toNum = (v: string): number | null =>
  v.trim() === "" ? null : Number(v);

export const isEmpty = (v: string) => v.trim() === "";
