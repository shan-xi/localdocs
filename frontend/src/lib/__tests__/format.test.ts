import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatShortDate } from '../format'

describe('formatBytes', () => {
  it('formats bytes below 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes and megabytes to one decimal place', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1.5)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
  })

  it('formats gigabytes to two decimal places', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.00 GB')
  })
})

describe('date formatters', () => {
  it('returns the original value for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
    expect(formatShortDate('not-a-date')).toBe('not-a-date')
  })

  it('formats valid dates as locale date strings', () => {
    const value = '2026-01-02T03:04:05Z'
    expect(formatDate(value)).toBe(new Date(value).toLocaleString())
    expect(formatShortDate(value)).toBe(new Date(value).toLocaleDateString())
  })
})
