import clsx from 'clsx'
import { AlertTriangle, AudioLines, ShieldAlert } from 'lucide-react'
import { formatClock, formatRelativeTime } from '../lib/format'
import { useLanguage } from '../lib/i18n'
import { useFocusMuteStore } from '../stores/useFocusMuteStore'

const EMPTY_LOGS: ReturnType<typeof getEmptyLogs> = []

function getEmptyLogs() {
  return [] as const
}

export function LogPanel() {
  const { language, text } = useLanguage()
  const snapshot = useFocusMuteStore((state) => state.snapshot)
  const logs = snapshot?.logs ?? EMPTY_LOGS

  return (
    <div className="logs">
      {logs.length === 0 ? (
        <div className="empty-state">
          <div>
            <h3>{text.logs.emptyTitle}</h3>
            <p>{text.logs.emptyDescription}</p>
          </div>
        </div>
      ) : null}

      {logs.map((entry) => (
        <article className="log-row" key={entry.id}>
          <div
            className={clsx(
              'log-row__marker',
              entry.level === 'warning' && 'log-row__marker--warning',
              entry.level === 'error' && 'log-row__marker--error',
            )}
          >
            {entry.level === 'error' ? (
              <ShieldAlert size={16} />
            ) : entry.level === 'warning' ? (
              <AlertTriangle size={16} />
            ) : (
              <AudioLines size={16} />
            )}
          </div>

          <div>
            <h3>{entry.action}</h3>
            <p>{entry.message}</p>
          </div>

          <time title={formatClock(entry.timestamp, language)}>{formatRelativeTime(entry.timestamp, language)}</time>
        </article>
      ))}
    </div>
  )
}
