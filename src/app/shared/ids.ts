import Sqids from 'sqids';

const sqids = new Sqids({
  alphabet: 'k5sxzPm4LGE6QbHFAj0KVnMY87cgNOe1TpraWu9dRIBUiZhvqlfw2DCJyt3oXS',
  minLength: 5,
});

export function encodeId(id: number): string {
  return sqids.encode([id]);
}

export function decodeId(hash: string): number | null {
  try {
    const ids = sqids.decode(hash);
    if (ids.length !== 1 || ids[0] <= 0) return null;
    if (sqids.encode(ids) !== hash) return null;
    return ids[0];
  } catch {
    return null;
  }
}
