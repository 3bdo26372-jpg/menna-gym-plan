/** Exact match, or `*` as a wildcard (e.g. https://menna-gym-plan-*.vercel.app). */
export function originMatches(pattern: string, origin: string) {
  if (pattern === '*' || pattern === origin) return true
  if (!pattern.includes('*')) return false
  const regex = new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]*')}$`)
  return regex.test(origin)
}
