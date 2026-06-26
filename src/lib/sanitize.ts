export function sanitizeString(val: unknown, maxLen = 5000): string {
  if (typeof val !== 'string') return ''
  return val.trim().slice(0, maxLen)
}

export function sanitizeNumber(val: unknown, min = 0, max = 1_000_000_000): number {
  const n = Number(val)
  if (isNaN(n)) return min
  return Math.min(Math.max(n, min), max)
}

export function sanitizeArray<T>(val: unknown, maxItems = 100): T[] {
  if (!Array.isArray(val)) return []
  return val.slice(0, maxItems) as T[]
}

export function sanitizeJson(val: unknown, maxDepth = 5): string {
  if (val === null || val === undefined) return '[]'
  if (typeof val === 'string') {
    try { JSON.parse(val); return val } catch { return '[]' }
  }
  try {
    return JSON.stringify(val, (key, value) => {
      if (typeof value === 'string' && value.length > 10000) return value.slice(0, 10000)
      return value
    })
  } catch {
    return '[]'
  }
}

export function validateId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 100 && /^[a-zA-Z0-9-_]+$/.test(id)
}
