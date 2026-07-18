// Bank loader: static JSON packs bundled at build time (offline by construction).
// Adding a pack = drop the JSON in /content/bank and list it here.

import type { BankPack, Item } from './types'
import seedV1 from '@bank/seed-v1.json'

const PACKS: BankPack[] = [seedV1 as BankPack]

export function loadBank(): Item[] {
  return PACKS.flatMap((p) => p.items)
}

export function itemById(id: string): Item | undefined {
  return loadBank().find((i) => i.id === id)
}
