import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import type { AppSnapshot } from '../types'
import { useFocusMuteStore } from '../stores/useFocusMuteStore'

const SNAPSHOT_EVENT = 'focusmute://snapshot'

export function useDesktopEvents() {
  const hydrate = useFocusMuteStore((state) => state.hydrate)

  useEffect(() => {
    let active = true
    let unlisten: (() => void) | undefined

    void listen<AppSnapshot>(SNAPSHOT_EVENT, (event) => {
      if (active) {
        hydrate(event.payload)
      }
    }).then((callback) => {
      unlisten = callback
    })

    return () => {
      active = false
      unlisten?.()
    }
  }, [hydrate])
}
