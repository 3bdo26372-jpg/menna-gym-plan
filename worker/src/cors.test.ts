import { describe, expect, it } from 'vitest'
import { originMatches } from './cors'

describe('CORS origin patterns', () => {
  it('matches exact origins and Vercel preview wildcards only', () => {
    expect(originMatches('https://menna-gym-plan.vercel.app', 'https://menna-gym-plan.vercel.app')).toBe(true)
    expect(originMatches('https://menna-gym-plan-*.vercel.app', 'https://menna-gym-plan-git-main-3bdo26372-4210s-projects.vercel.app')).toBe(true)
    expect(originMatches('https://menna-gym-plan-*.vercel.app', 'https://menna-gym-plan-x.evil.com')).toBe(false)
    expect(originMatches('https://menna-gym-plan-*.vercel.app', 'https://evil.com/?https://menna-gym-plan-a.vercel.app')).toBe(false)
    expect(originMatches('http://localhost:5173', 'http://localhost:5174')).toBe(false)
  })
})
