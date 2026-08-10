/**
 * Normalize an OpenAI-compatible base URL.
 *
 * Rules:
 * - Strip trailing slash.
 * - Do NOT append /v1 automatically. Many providers already include it,
 *   and others use custom paths such as /v1beta/openai.
 * - The caller is responsible for choosing which URL to store after
 *   probing /models vs /v1/models.
 */
export function normalizeEndpointUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  return trimmed
}
