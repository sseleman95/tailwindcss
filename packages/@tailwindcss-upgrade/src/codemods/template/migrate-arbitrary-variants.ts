import type { Config } from '../../../../tailwindcss/src/compat/plugin-api'
import type { DesignSystem } from '../../../../tailwindcss/src/design-system'
import { DefaultMap } from '../../../../tailwindcss/src/utils/default-map'
import { replaceObject } from '../../utils/replace-object'
import type { Writable } from '../../utils/types'
import { walkVariants } from '../../utils/walk-variants'
import { computeVariantSignature } from './signatures'

const variantsLookup = new DefaultMap<DesignSystem, DefaultMap<string, string[]>>(
  (designSystem) => {
    let signatures = computeVariantSignature.get(designSystem)
    let lookup = new DefaultMap<string, string[]>(() => [])

    // Actual static variants
    for (let [root, variant] of designSystem.variants.entries()) {
      if (variant.kind === 'static') {
        let signature = signatures.get(root)
        if (typeof signature !== 'string') continue
        lookup.get(signature).push(root)
      }
    }

    return lookup
  },
)

export function migrateArbitraryVariants(
  designSystem: DesignSystem,
  _userConfig: Config | null,
  rawCandidate: string,
): string {
  let signatures = computeVariantSignature.get(designSystem)
  let variants = variantsLookup.get(designSystem)

  for (let readonlyCandidate of designSystem.parseCandidate(rawCandidate)) {
    // We are only interested in the variants
    if (readonlyCandidate.variants.length <= 0) return rawCandidate

    // The below logic makes use of mutation. Since candidates in the
    // DesignSystem are cached, we can't mutate them directly.
    let candidate = structuredClone(readonlyCandidate) as Writable<typeof readonlyCandidate>

    for (let [variant] of walkVariants(candidate)) {
      if (variant.kind === 'compound') continue

      let targetString = designSystem.printVariant(variant)
      let targetSignature = signatures.get(targetString)
      if (typeof targetSignature !== 'string') continue

      let foundVariants = variants.get(targetSignature)
      if (foundVariants.length !== 1) continue

      let foundVariant = foundVariants[0]
      let parsedVariant = designSystem.parseVariant(foundVariant)
      if (parsedVariant === null) continue

      replaceObject(variant, parsedVariant)
    }

    return designSystem.printCandidate(candidate)
  }

  return rawCandidate
}
