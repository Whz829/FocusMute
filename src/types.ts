export type Language = 'zh' | 'en'
export type ListMode = 'whitelist' | 'blacklist'
export type RuleListKind = 'whitelist' | 'blacklist'
export type LogLevel = 'info' | 'warning' | 'error'

export interface AppSettingsSnapshot {
  autoMuteEnabled: boolean
  listMode: ListMode
  whitelist: string[]
  blacklist: string[]
  minimizeToTray: boolean
  launchAtStartup: boolean
  pollingIntervalMs: number
}

export interface ProcessSnapshot {
  pid: number
  name: string
  exeName: string
  exePath: string | null
  iconDataUrl: string | null
  inWhitelist: boolean
  inBlacklist: boolean
  hasAudioSession: boolean
  isMuted: boolean
  isForeground: boolean
  policyTargeted: boolean
  policyReason: string
}

export interface LogEntry {
  id: number
  timestamp: string
  level: LogLevel
  action: string
  processName: string | null
  pid: number | null
  message: string
}

export interface AppSnapshot {
  settings: AppSettingsSnapshot
  processes: ProcessSnapshot[]
  mutedPids: number[]
  foregroundPid: number | null
  logs: LogEntry[]
  lastUpdated: string
  lastError: string | null
}
