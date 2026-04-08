import { FolderOpen, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLanguage } from '../lib/i18n'
import { useFocusMuteStore } from '../stores/useFocusMuteStore'
import type { RuleListKind } from '../types'

function RuleList({
  title,
  description,
  items,
  kind,
}: {
  title: string
  description: string
  items: string[]
  kind: RuleListKind
}) {
  const { text } = useLanguage()
  const [value, setValue] = useState('')
  const addRule = useFocusMuteStore((state) => state.addRule)
  const removeRule = useFocusMuteStore((state) => state.removeRule)
  const pickRuleExecutable = useFocusMuteStore((state) => state.pickRuleExecutable)

  const handleSubmit = async () => {
    const normalized = value.trim()
    if (!normalized) {
      return
    }
    await addRule(kind, normalized)
    setValue('')
  }

  const handlePickExecutable = async () => {
    const selected = await pickRuleExecutable()
    if (!selected) {
      return
    }
    setValue(selected)
    await addRule(kind, selected)
    setValue('')
  }

  return (
    <section className="settings-card">
      <div className="settings-card__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="rule-input">
        <input
          value={value}
          placeholder={text.strategy.inputPlaceholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSubmit()
            }
          }}
        />
        <div className="rule-input__actions">
          <button className="secondary-button rule-picker-button" type="button" onClick={() => void handlePickExecutable()}>
            <FolderOpen size={16} />
            {text.strategy.pickExecutable}
          </button>
          <button className="primary-button" type="button" onClick={() => void handleSubmit()}>
            <Plus size={16} />
            {text.strategy.addRule}
          </button>
        </div>
      </div>

      <div className="rule-chips">
        {items.length === 0 ? <span className="chip">{text.strategy.emptyRules}</span> : null}
        {items.map((item) => (
          <span className="chip" key={`${kind}-${item}`}>
            {item}
            <button type="button" aria-label={`${text.strategy.removeRule} ${item}`} onClick={() => void removeRule(kind, item)}>
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
    </section>
  )
}

export function RuleManager() {
  const { text } = useLanguage()
  const snapshot = useFocusMuteStore((state) => state.snapshot)
  const setListMode = useFocusMuteStore((state) => state.setListMode)

  const ruleSummary = useMemo(() => {
    if (!snapshot) {
      return text.strategy.waiting
    }
    return snapshot.settings.listMode === 'blacklist' ? text.strategy.blacklistSummary : text.strategy.whitelistSummary
  }, [snapshot, text])

  return (
    <div className="rule-manager">
      <section className="settings-card rule-manager__mode">
        <div className="settings-card__header">
          <div>
            <h3>{text.strategy.modeTitle}</h3>
            <p>{ruleSummary}</p>
          </div>
        </div>

        <div className="segmented-control segmented-control--full" role="tablist" aria-label={text.strategy.modeTitle}>
          <button
            className={`segmented-control__item ${
              snapshot?.settings.listMode === 'whitelist' ? 'segmented-control__item--active' : ''
            }`}
            type="button"
            onClick={() => void setListMode('whitelist')}
          >
            {text.strategy.whitelistMode}
          </button>
          <button
            className={`segmented-control__item ${
              snapshot?.settings.listMode === 'blacklist' ? 'segmented-control__item--active' : ''
            }`}
            type="button"
            onClick={() => void setListMode('blacklist')}
          >
            {text.strategy.blacklistMode}
          </button>
        </div>
      </section>

      <div className="rule-manager__lists">
        <RuleList
          title={text.strategy.whitelistTitle}
          description={text.strategy.whitelistDescription}
          items={snapshot?.settings.whitelist ?? []}
          kind="whitelist"
        />

        <RuleList
          title={text.strategy.blacklistTitle}
          description={text.strategy.blacklistDescription}
          items={snapshot?.settings.blacklist ?? []}
          kind="blacklist"
        />
      </div>
    </div>
  )
}
