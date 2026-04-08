import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AudioLines,
  BellRing,
  Bot,
  LayoutDashboard,
  ListVideo,
  Logs,
  Minimize2,
  MoonStar,
  Power,
  Settings2,
  ShieldCheck,
  Square,
  SunMedium,
  VolumeX,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogPanel } from './components/LogPanel'
import { ProcessTable } from './components/ProcessTable'
import { RuleManager } from './components/RuleManager'
import { SettingsPanel } from './components/SettingsPanel'
import { useDesktopEvents } from './hooks/useDesktopEvents'
import { useLanguage } from './lib/i18n'
import { useFocusMuteStore } from './stores/useFocusMuteStore'

type ThemeMode = 'light' | 'dark'
type AppView = 'home' | 'strategy' | 'processes' | 'logs' | 'settings'

const THEME_STORAGE_KEY = 'focusmute-theme'

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return {
    theme,
    toggleTheme: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
  }
}

function App() {
  useDesktopEvents()

  const { text } = useLanguage()
  const [view, setView] = useState<AppView>('home')
  const { theme, toggleTheme } = useThemeMode()

  const snapshot = useFocusMuteStore((state) => state.snapshot)
  const commandPending = useFocusMuteStore((state) => state.commandPending)
  const error = useFocusMuteStore((state) => state.error)
  const refresh = useFocusMuteStore((state) => state.refresh)
  const hideMainWindow = useFocusMuteStore((state) => state.hideMainWindow)
  const setAutoMuteEnabled = useFocusMuteStore((state) => state.setAutoMuteEnabled)
  const setListMode = useFocusMuteStore((state) => state.setListMode)
  const setMinimizeToTray = useFocusMuteStore((state) => state.setMinimizeToTray)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    void refresh()
  }, [refresh])

  const navItems = useMemo(
    () => [
      { id: 'home' as const, label: text.nav.home.label, description: text.nav.home.description, icon: LayoutDashboard },
      { id: 'strategy' as const, label: text.nav.strategy.label, description: text.nav.strategy.description, icon: ShieldCheck },
      { id: 'processes' as const, label: text.nav.processes.label, description: text.nav.processes.description, icon: ListVideo },
      { id: 'logs' as const, label: text.nav.logs.label, description: text.nav.logs.description, icon: Logs },
      { id: 'settings' as const, label: text.nav.settings.label, description: text.nav.settings.description, icon: Settings2 },
    ],
    [text],
  )

  const currentView = navItems.find((item) => item.id === view) ?? navItems[0]

  const summary = useMemo(() => {
    const processes = snapshot?.processes ?? []
    return {
      total: processes.length,
      muted: processes.filter((item) => item.isMuted).length,
      targeted: processes.filter((item) => item.policyTargeted).length,
      audio: processes.filter((item) => item.hasAudioSession).length,
    }
  }, [snapshot])

  return (
    <div className="shell">
      <div className="shell__backdrop shell__backdrop--primary" />
      <div className="shell__backdrop shell__backdrop--secondary" />

      <header className="window-titlebar">
        <div
          className="window-titlebar__drag"
          data-tauri-drag-region
          onDoubleClick={() => {
            void appWindow.toggleMaximize()
          }}
        >
          <div className="window-titlebar__brand" data-tauri-drag-region>
            <div className="window-titlebar__icon" data-tauri-drag-region>
              <VolumeX size={14} />
            </div>
            <span data-tauri-drag-region>FocusMute</span>
          </div>
        </div>

        <div className="window-titlebar__actions">
          <button
            className="window-titlebar__button"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void appWindow.minimize()
            }}
            aria-label="Minimize"
          >
            <Minimize2 size={14} />
          </button>
          <button
            className="window-titlebar__button"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void appWindow.toggleMaximize()
            }}
            aria-label="Maximize"
          >
            <Square size={13} />
          </button>
          <button
            className="window-titlebar__button window-titlebar__button--danger"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void appWindow.close()
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <motion.main layout transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="workspace">
        <motion.aside layout transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="sidebar">
          <div className="sidebar__brand">
            <div className="sidebar__brand-mark">
              <VolumeX size={18} />
            </div>
            <div className="sidebar__brand-copy">
              <strong>FocusMute</strong>
              <p>{text.app.brandTagline}</p>
            </div>
          </div>

          <nav className="sidebar__nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  className={`sidebar__nav-item ${view === item.id ? 'sidebar__nav-item--active' : ''}`}
                  type="button"
                  onClick={() => setView(item.id)}
                  title={item.label}
                >
                  <span className="sidebar__nav-icon">
                    <Icon size={18} />
                  </span>
                  <span className="sidebar__nav-label">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="sidebar__footer">
            <span className={snapshot?.settings.autoMuteEnabled ? 'status-pill status-pill--active' : 'status-pill'}>
              {snapshot?.settings.autoMuteEnabled ? text.status.autoMuteOn : text.status.autoMuteOff}
            </span>
            <span className="status-pill">
              {snapshot?.settings.listMode === 'blacklist' ? text.status.blacklistMode : text.status.whitelistMode}
            </span>
          </div>
        </motion.aside>

        <motion.section layout transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="content">
          <motion.header layout transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="topbar">
            <div>
              <h1>{currentView.label}</h1>
              <p>{currentView.description}</p>
            </div>

            <div className="topbar__actions">
              {view === 'home' ? (
                <>
                  <button className="secondary-button" type="button" onClick={() => void refresh()}>
                    {text.app.refresh}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void hideMainWindow()}>
                    {text.app.hideToTray}
                  </button>
                </>
              ) : null}
              <button className="ghost-button theme-button" type="button" onClick={toggleTheme} aria-label={text.app.toggleTheme}>
                {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
              </button>
            </div>
          </motion.header>

          <AnimatePresence>
            {snapshot?.lastError ? (
              <motion.section className="banner banner--danger" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <BellRing size={16} />
                <span>{snapshot.lastError}</span>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {error ? (
              <motion.section className="banner banner--warning" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <Bot size={16} />
                <span>{error}</span>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {view === 'home' ? (
              <motion.div
                key="home"
                className="view-stack"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.section layout transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="metrics-grid">
                  <motion.article layout className="metric-card">
                    <div className="metric-card__icon">
                      <Activity size={18} />
                    </div>
                    <div>
                      <span>{text.home.metrics.total}</span>
                      <strong>{summary.total}</strong>
                    </div>
                  </motion.article>
                  <motion.article layout className="metric-card">
                    <div className="metric-card__icon">
                      <AudioLines size={18} />
                    </div>
                    <div>
                      <span>{text.home.metrics.audio}</span>
                      <strong>{summary.audio}</strong>
                    </div>
                  </motion.article>
                  <motion.article layout className="metric-card">
                    <div className="metric-card__icon">
                      <VolumeX size={18} />
                    </div>
                    <div>
                      <span>{text.home.metrics.muted}</span>
                      <strong>{summary.muted}</strong>
                    </div>
                  </motion.article>
                  <motion.article layout className="metric-card">
                    <div className="metric-card__icon">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <span>{text.home.metrics.targeted}</span>
                      <strong>{summary.targeted}</strong>
                    </div>
                  </motion.article>
                </motion.section>

                <motion.div layout transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="content-grid">
                  <motion.section layout className="panel panel--primary">
                    <div className="panel__header">
                      <div>
                        <h2>{text.home.quickControls}</h2>
                      </div>
                    </div>

                    <div className="control-stack">
                      <button
                        className={`control-row ${snapshot?.settings.autoMuteEnabled ? 'control-row--active' : ''}`}
                        type="button"
                        onClick={() => void setAutoMuteEnabled(!snapshot?.settings.autoMuteEnabled)}
                      >
                        <div className="control-row__icon">
                          <Power size={16} />
                        </div>
                        <div className="control-row__copy">
                          <strong>{text.home.autoMuteTitle}</strong>
                          <span>{snapshot?.settings.autoMuteEnabled ? text.home.autoMuteEnabled : text.home.autoMuteDisabled}</span>
                        </div>
                        <span className="control-row__state">{snapshot?.settings.autoMuteEnabled ? text.home.enabled : text.home.disabled}</span>
                      </button>

                      <button
                        className={`control-row ${snapshot?.settings.minimizeToTray ? 'control-row--active' : ''}`}
                        type="button"
                        onClick={() => void setMinimizeToTray(!snapshot?.settings.minimizeToTray)}
                      >
                        <div className="control-row__icon">
                          <Minimize2 size={16} />
                        </div>
                        <div className="control-row__copy">
                          <strong>{text.home.minimizeTitle}</strong>
                          <span>{snapshot?.settings.minimizeToTray ? text.home.minimizeEnabled : text.home.minimizeDisabled}</span>
                        </div>
                        <span className="control-row__state">{snapshot?.settings.minimizeToTray ? text.home.enabled : text.home.disabled}</span>
                      </button>
                    </div>

                    <div className="segmented-control" role="tablist" aria-label={text.home.modeLabel}>
                      <button
                        className={`segmented-control__item ${snapshot?.settings.listMode === 'whitelist' ? 'segmented-control__item--active' : ''}`}
                        type="button"
                        onClick={() => void setListMode('whitelist')}
                      >
                        {text.home.whitelistMode}
                      </button>
                      <button
                        className={`segmented-control__item ${snapshot?.settings.listMode === 'blacklist' ? 'segmented-control__item--active' : ''}`}
                        type="button"
                        onClick={() => void setListMode('blacklist')}
                      >
                        {text.home.blacklistMode}
                      </button>
                    </div>

                    {commandPending ? (
                      <div className="home-summary">
                        <span className="status-pill">{text.app.syncing}</span>
                      </div>
                    ) : null}
                  </motion.section>

                  <motion.section layout className="panel">
                    <div className="panel__header">
                      <div>
                        <h2>{text.home.processBrief}</h2>
                      </div>
                    </div>
                    <ProcessTable limit={6} density="compact" searchPlaceholder={text.processTable.searchPlaceholder} />
                  </motion.section>
                </motion.div>
              </motion.div>
            ) : null}

            {view === 'strategy' ? (
              <motion.div key="strategy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <RuleManager />
              </motion.div>
            ) : null}

            {view === 'processes' ? (
              <motion.section key="processes" className="panel panel--fill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <ProcessTable density="regular" searchPlaceholder={text.processTable.searchPlaceholder} />
              </motion.section>
            ) : null}

            {view === 'logs' ? (
              <motion.section key="logs" className="panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <LogPanel />
              </motion.section>
            ) : null}

            {view === 'settings' ? (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <SettingsPanel />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </motion.main>
    </div>
  )
}

export default App
