import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import type { AppSnapshot, ListMode, RuleListKind } from '../types'

interface FocusMuteStore {
  snapshot: AppSnapshot | null
  commandPending: boolean
  error: string | null
  refresh: () => Promise<void>
  hydrate: (snapshot: AppSnapshot) => void
  setAutoMuteEnabled: (enabled: boolean) => Promise<void>
  setListMode: (mode: ListMode) => Promise<void>
  addRule: (kind: RuleListKind, value: string) => Promise<void>
  removeRule: (kind: RuleListKind, value: string) => Promise<void>
  setLaunchAtStartup: (enabled: boolean) => Promise<void>
  setMinimizeToTray: (enabled: boolean) => Promise<void>
  setPollingIntervalMs: (value: number) => Promise<void>
  showMainWindow: () => Promise<void>
  hideMainWindow: () => Promise<void>
  openProcessPath: (path: string | null) => Promise<void>
  pickRuleExecutable: () => Promise<string | null>
}

async function runCommand<T>(command: string, payload?: Record<string, unknown>) {
  return invoke<T>(command, payload)
}

export const useFocusMuteStore = create<FocusMuteStore>((set) => {
  const syncSnapshot = async (command: string, payload?: Record<string, unknown>) => {
    set({ commandPending: true, error: null })
    try {
      const snapshot = await runCommand<AppSnapshot>(command, payload)
      set({ snapshot, commandPending: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      set({ commandPending: false, error: message })
    }
  }

  return {
    snapshot: null,
    commandPending: false,
    error: null,
    refresh: async () => {
      await syncSnapshot('get_snapshot')
    },
    hydrate: (snapshot) => set({ snapshot, error: null }),
    setAutoMuteEnabled: async (enabled) => {
      await syncSnapshot('set_auto_mute_enabled', { enabled })
    },
    setListMode: async (mode) => {
      await syncSnapshot('set_list_mode', { mode })
    },
    addRule: async (kind, value) => {
      await syncSnapshot('upsert_rule', { kind, value })
    },
    removeRule: async (kind, value) => {
      await syncSnapshot('remove_rule', { kind, value })
    },
    setLaunchAtStartup: async (enabled) => {
      await syncSnapshot('set_launch_at_startup', { enabled })
    },
    setMinimizeToTray: async (enabled) => {
      await syncSnapshot('set_minimize_to_tray', { enabled })
    },
    setPollingIntervalMs: async (value) => {
      await syncSnapshot('set_polling_interval_ms', { value })
    },
    showMainWindow: async () => {
      try {
        await runCommand('show_main_window')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        set({ error: message })
      }
    },
    hideMainWindow: async () => {
      try {
        await runCommand('hide_main_window')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        set({ error: message })
      }
    },
    openProcessPath: async (path) => {
      if (!path) {
        set({ error: '该进程没有可用路径。' })
        return
      }

      try {
        await runCommand('open_process_path', { path })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        set({ error: message })
      }
    },
    pickRuleExecutable: async () => {
      try {
        const value = await runCommand<string | null>('pick_rule_executable')
        return value ?? null
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        set({ error: message })
        return null
      }
    },
  }
})
