import type { Language } from '../types'

export function formatRelativeTime(value: string, language: Language) {
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) {
    return value
  }

  const diffSeconds = Math.round((Date.now() - target) / 1000)
  const abs = Math.abs(diffSeconds)

  if (language === 'en') {
    if (abs < 5) {
      return 'Just now'
    }
    if (abs < 60) {
      return `${abs}s ago`
    }
    if (abs < 3600) {
      return `${Math.round(abs / 60)}m ago`
    }
    if (abs < 86400) {
      return `${Math.round(abs / 3600)}h ago`
    }

    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(target))
  }

  if (abs < 5) {
    return '刚刚'
  }
  if (abs < 60) {
    return `${abs} 秒前`
  }
  if (abs < 3600) {
    return `${Math.round(abs / 60)} 分钟前`
  }
  if (abs < 86400) {
    return `${Math.round(abs / 3600)} 小时前`
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(target))
}

export function formatClock(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}
