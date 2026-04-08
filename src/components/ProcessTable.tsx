import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Focus,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useLanguage } from '../lib/i18n'
import { useFocusMuteStore } from '../stores/useFocusMuteStore'
import type { ListMode, ProcessSnapshot } from '../types'

interface ProcessTableProps {
  density?: 'compact' | 'regular'
  limit?: number
  searchPlaceholder?: string
}

interface PolicyMeta {
  pill: string
  pillClass: string
  detail: string
}

const EMPTY_PROCESSES: ProcessSnapshot[] = []

function resolvePolicyMeta(
  process: ProcessSnapshot,
  listMode: ListMode,
  autoMuteEnabled: boolean,
  text: ReturnType<typeof useLanguage>['text'],
): PolicyMeta {
  if (!process.hasAudioSession) {
    return { pill: text.processTable.policyNone, pillClass: 'tag tag--neutral', detail: text.processTable.noAudio }
  }
  if (!autoMuteEnabled) {
    return {
      pill: text.processTable.policyNone,
      pillClass: 'tag tag--neutral',
      detail: text.processTable.autoMuteDisabled,
    }
  }
  if (process.isForeground) {
    return {
      pill: text.processTable.policyNone,
      pillClass: 'tag tag--neutral',
      detail: text.processTable.foregroundDetail,
    }
  }
  if (process.inWhitelist) {
    return {
      pill: text.processTable.policyWhitelist,
      pillClass: 'tag tag--info',
      detail: text.processTable.matchedWhitelist,
    }
  }
  if (process.inBlacklist) {
    return {
      pill: text.processTable.policyBlacklist,
      pillClass: 'tag tag--danger',
      detail: text.processTable.matchedBlacklist,
    }
  }
  if (process.policyTargeted) {
    return {
      pill: listMode === 'blacklist' ? text.processTable.policyHit : text.processTable.policyBackgroundMute,
      pillClass: 'tag tag--warning',
      detail: text.processTable.backgroundMutedByPolicy,
    }
  }
  return {
    pill: text.processTable.policyNone,
    pillClass: 'tag tag--neutral',
    detail: listMode === 'blacklist' ? text.processTable.notMatchedBlacklist : text.processTable.ignored,
  }
}

export function ProcessTable({ density = 'regular', limit, searchPlaceholder }: ProcessTableProps) {
  const { text } = useLanguage()
  const snapshot = useFocusMuteStore((state) => state.snapshot)
  const addRule = useFocusMuteStore((state) => state.addRule)
  const removeRule = useFocusMuteStore((state) => state.removeRule)
  const refresh = useFocusMuteStore((state) => state.refresh)
  const openProcessPath = useFocusMuteStore((state) => state.openProcessPath)
  const [query, setQuery] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Record<number, boolean>>({})
  const [audioOnly, setAudioOnly] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const enableLayoutAnimation = density === 'compact'

  const listMode = snapshot?.settings.listMode ?? 'whitelist'
  const autoMuteEnabled = snapshot?.settings.autoMuteEnabled ?? true

  const processes = useMemo(() => {
    const list = snapshot?.processes ?? EMPTY_PROCESSES
    const normalized = deferredQuery.trim().toLowerCase()

    let filtered = audioOnly ? list.filter((item) => item.hasAudioSession) : list

    if (normalized) {
      filtered = filtered.filter((item) =>
        [item.name, item.exeName, item.exePath ?? '', String(item.pid)].join(' ').toLowerCase().includes(normalized),
      )
    }

    return typeof limit === 'number' ? filtered.slice(0, limit) : filtered
  }, [audioOnly, deferredQuery, limit, snapshot?.processes])

  return (
    <>
      <motion.div
        layout={enableLayoutAnimation}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="table-toolbar"
      >
        <input
          className="search-input search-input--toolbar"
          value={query}
          placeholder={searchPlaceholder ?? text.processTable.searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
        />

        <motion.div
          layout={enableLayoutAnimation}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="table-toolbar__actions"
        >
          <button
            className={clsx('toolbar-pill-button', audioOnly && 'toolbar-pill-button--active')}
            type="button"
            onClick={() => setAudioOnly((value) => !value)}
          >
            {text.processTable.audioOnly}
          </button>
          <button className="toolbar-pill-button toolbar-pill-button--icon" type="button" onClick={() => void refresh()}>
            <RefreshCw size={15} />
          </button>
          <span className="table-meta">
            {text.processTable.totalPrefix ? `${text.processTable.totalPrefix} ` : ''}
            {processes.length} {text.processTable.totalSuffix}
          </span>
        </motion.div>
      </motion.div>

      <motion.div layout={enableLayoutAnimation} className="table table--processes">
        {processes.length === 0 ? (
          <div className="empty-state">
            <div>
              <h3>{text.processTable.emptyTitle}</h3>
              <p>{text.processTable.emptyDescription}</p>
            </div>
          </div>
        ) : null}

        {processes.map((process) => {
          const isExpanded = Boolean(expandedPaths[process.pid])
          const pathText = process.exePath ?? text.processTable.systemProcessPath
          const policy = resolvePolicyMeta(process, listMode, autoMuteEnabled, text)

          return (
            <motion.article
              layout={enableLayoutAnimation}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`process-card process-card--${density}`}
              key={`${process.pid}-${process.exeName}`}
            >
              <div className="process-card__main">
                <button
                  className="process-row__title process-row__title--button"
                  type="button"
                  onClick={() => void openProcessPath(process.exePath)}
                  title={process.exePath ?? text.processTable.pathUnavailable}
                >
                  <div className="process-row__avatar">
                    {process.iconDataUrl ? (
                      <img className="process-row__icon" src={process.iconDataUrl} alt={`${process.name} ${text.processTable.iconAltSuffix}`} />
                    ) : (
                      <Cpu size={18} />
                    )}
                  </div>
                  <div>
                    <h3>{process.name}</h3>
                    <p>
                      {process.exeName} · PID {process.pid}
                    </p>
                  </div>
                </button>

                <div className="process-tags">
                  {process.isForeground ? (
                    <span className={clsx('tag', 'tag--accent', 'tag--plain')}>
                      <Focus size={12} />
                      {text.processTable.foreground}
                    </span>
                  ) : null}
                  {process.hasAudioSession ? (
                    <span className={clsx('tag', process.isMuted ? 'tag--muted' : 'tag--active', 'tag--plain')}>
                      {process.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      {process.isMuted ? text.processTable.muted : text.processTable.speaking}
                    </span>
                  ) : (
                    <span className={clsx('tag', 'tag--neutral', 'tag--plain')}>{text.processTable.noAudio}</span>
                  )}
                  <span className={clsx(policy.pillClass, 'tag--plain')}>{policy.pill}</span>
                </div>
              </div>

              <div className="process-card__path">
                <button
                  className={clsx('path-toggle', isExpanded && 'path-toggle--expanded')}
                  type="button"
                  onClick={() =>
                    setExpandedPaths((current) => ({
                      ...current,
                      [process.pid]: !current[process.pid],
                    }))
                  }
                  title={pathText}
                >
                  <span className="path-toggle__label">
                    <FolderOpen size={14} />
                    {isExpanded ? text.processTable.hidePath : text.processTable.viewPath}
                  </span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.span
                      key="path"
                      className="value-dim"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      {pathText}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="process-card__meta">
                <div className="status-pair status-pair--stack">
                  <strong>{text.processTable.policyResult}</strong>
                  <span className="value-dim">{policy.detail}</span>
                </div>
              </div>

              <div className="process-card__actions process-card__actions--inline">
                <button
                  className={clsx(
                    'utility-button',
                    'utility-button--compact',
                    'utility-button--tiny',
                    process.inWhitelist ? 'utility-button--selected utility-button--white' : 'utility-button--ghosty',
                  )}
                  type="button"
                  aria-label={process.inWhitelist ? text.processTable.removeWhitelist : text.processTable.addWhitelist}
                  onClick={() =>
                    void (process.inWhitelist
                      ? removeRule('whitelist', process.exeName)
                      : addRule('whitelist', process.exeName))
                  }
                >
                  {process.inWhitelist ? <X size={13} /> : <ShieldCheck size={13} />}
                  <span>{text.processTable.whitelistShort}</span>
                </button>

                <button
                  className={clsx(
                    'utility-button',
                    'utility-button--compact',
                    'utility-button--tiny',
                    process.inBlacklist ? 'utility-button--selected utility-button--black' : 'utility-button--ghosty',
                  )}
                  type="button"
                  aria-label={process.inBlacklist ? text.processTable.removeBlacklist : text.processTable.addBlacklist}
                  onClick={() =>
                    void (process.inBlacklist
                      ? removeRule('blacklist', process.exeName)
                      : addRule('blacklist', process.exeName))
                  }
                >
                  {process.inBlacklist ? <X size={13} /> : <VolumeX size={13} />}
                  <span>{text.processTable.blacklistShort}</span>
                </button>
              </div>
            </motion.article>
          )
        })}
      </motion.div>
    </>
  )
}
