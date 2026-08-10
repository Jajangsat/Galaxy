import { describe, it, expect } from 'vitest'
import { normalizeEndpointUrl } from './endpoint'

describe('normalizeEndpointUrl', () => {
  it('should strip trailing slashes', () => {
    expect(normalizeEndpointUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1')
  })

  it('should not add /v1 if path already ends with /v1', () => {
    expect(normalizeEndpointUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1')
  })

  it('should not add /v1 if path has deeper OpenAI-compatible path', () => {
    expect(normalizeEndpointUrl('https://example.com/api/openai/v1')).toBe('https://example.com/api/openai/v1')
  })

  it('should preserve custom paths without forcing /v1', () => {
    expect(normalizeEndpointUrl('https://generativelanguage.googleapis.com/v1beta/openai')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai'
    )
  })

  it('should handle bare domain by keeping it as-is', () => {
    expect(normalizeEndpointUrl('https://api.example.com')).toBe('https://api.example.com')
  })

  it('should handle bare domain with trailing slash', () => {
    expect(normalizeEndpointUrl('https://api.example.com/')).toBe('https://api.example.com')
  })
})
