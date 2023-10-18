export function excludeFields<
  Obj extends Record<string, any>,
  Key extends keyof Obj
>(obj: Obj, keys: Key[]) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !(keys as string[]).includes(key))
  ) as Omit<Obj, Key>;
}
