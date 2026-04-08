import clsx from 'clsx'
import { Languages, MonitorSmartphone, Power, Rocket, Workflow } from 'lucide-react'
import { useLanguage } from '../lib/i18n'
import { useFocusMuteStore } from '../stores/useFocusMuteStore'

function Toggle({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => Promise<void>
}) {
  return (
    <button
      className={clsx('toggle', active && 'toggle--active')}
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => void onClick()}
    >
      <span className="toggle__thumb" />
    </button>
  )
}

export function SettingsPanel() {
  const { language, setLanguage, text } = useLanguage()
  const snapshot = useFocusMuteStore((state) => state.snapshot)
  const setAutoMuteEnabled = useFocusMuteStore((state) => state.setAutoMuteEnabled)
  const setLaunchAtStartup = useFocusMuteStore((state) => state.setLaunchAtStartup)
  const setMinimizeToTray = useFocusMuteStore((state) => state.setMinimizeToTray)
  const setPollingIntervalMs = useFocusMuteStore((state) => state.setPollingIntervalMs)

  const settings = snapshot?.settings

  return (
    <section className="settings-card settings-card--merged">
      <div className="setting-item">
        <div>
          <h4>
            <Languages size={16} /> {text.settings.languageTitle}
          </h4>
          <p>{text.settings.languageDescription}</p>
        </div>
        <div className="segmented-control" role="tablist" aria-label={text.settings.languageTitle}>
          <button
            className={`segmented-control__item ${language === 'zh' ? 'segmented-control__item--active' : ''}`}
            type="button"
            onClick={() => setLanguage('zh')}
          >
            {text.settings.languageZh}
          </button>
          <button
            className={`segmented-control__item ${language === 'en' ? 'segmented-control__item--active' : ''}`}
            type="button"
            onClick={() => setLanguage('en')}
          >
            {text.settings.languageEn}
          </button>
        </div>
      </div>

      <div className="setting-item">
        <div>
          <h4>
            <Power size={16} /> {text.settings.autoMuteTitle}
          </h4>
          <p>{text.settings.autoMuteDescription}</p>
        </div>
        <Toggle active={Boolean(settings?.autoMuteEnabled)} onClick={() => setAutoMuteEnabled(!settings?.autoMuteEnabled)} />
      </div>

      <div className="setting-item">
        <div>
          <h4>
            <MonitorSmartphone size={16} /> {text.settings.trayTitle}
          </h4>
          <p>{text.settings.trayDescription}</p>
        </div>
        <Toggle active={Boolean(settings?.minimizeToTray)} onClick={() => setMinimizeToTray(!settings?.minimizeToTray)} />
      </div>

      <div className="setting-item">
        <div>
          <h4>
            <Rocket size={16} /> {text.settings.startupTitle}
          </h4>
          <p>{text.settings.startupDescription}</p>
        </div>
        <Toggle active={Boolean(settings?.launchAtStartup)} onClick={() => setLaunchAtStartup(!settings?.launchAtStartup)} />
      </div>

      <div className="settings-divider" />

      <div className="settings-card__header settings-card__header--sub">
        <div>
          <h3>{text.settings.pollingTitle}</h3>
          <p>{text.settings.pollingDescription}</p>
        </div>
      </div>

      <div className="interval-editor">
        <div className="interval-editor__value">
          <Workflow size={16} />
          <strong>{settings?.pollingIntervalMs ?? 900} ms</strong>
        </div>
        <input
          className="interval-slider"
          type="range"
          min="300"
          max="3000"
          step="100"
          value={settings?.pollingIntervalMs ?? 900}
          onChange={(event) => void setPollingIntervalMs(Number(event.target.value))}
        />
        <div className="interval-editor__labels">
          <span>{text.settings.faster}</span>
          <span>{text.settings.lowerCost}</span>
        </div>
      </div>
    </section>
  )
}
