use std::ptr::null;

use anyhow::Context;
use windows::{
    core::Interface,
    Win32::{
        Media::Audio::{
            eMultimedia, eRender, IAudioSessionControl2, IAudioSessionManager2, IMMDeviceEnumerator,
            ISimpleAudioVolume, MMDeviceEnumerator,
        },
        System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
    },
};

#[derive(Debug, Clone)]
pub struct AudioSessionInfo {
    pub pid: u32,
    pub muted: bool,
}

pub struct AudioController;

impl AudioController {
    pub fn new() -> anyhow::Result<Self> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        Ok(Self)
    }

    pub fn enumerate_sessions(&self) -> anyhow::Result<Vec<AudioSessionInfo>> {
        let manager = default_session_manager()?;
        let enumerator = unsafe { manager.GetSessionEnumerator() }.context("failed to get session enumerator")?;
        let count = unsafe { enumerator.GetCount() }.context("failed to get session count")?;
        let mut sessions = Vec::new();

        for index in 0..count {
            let control = unsafe { enumerator.GetSession(index) }
                .with_context(|| format!("failed to get session at index {index}"))?;
            let control2: IAudioSessionControl2 = control.cast().context("failed to cast session control")?;
            let volume: ISimpleAudioVolume = control.cast().context("failed to cast simple audio volume")?;
            let pid = unsafe { control2.GetProcessId() }.context("failed to get audio session pid")?;
            if pid == 0 {
                continue;
            }

            let muted = unsafe { volume.GetMute() }.context("failed to get mute state")?;
            sessions.push(AudioSessionInfo {
                pid,
                muted: muted.as_bool(),
            });
        }

        Ok(sessions)
    }

    pub fn set_mute_for_pid(&self, pid: u32, mute: bool) -> anyhow::Result<bool> {
        let manager = default_session_manager()?;
        let enumerator = unsafe { manager.GetSessionEnumerator() }.context("failed to get session enumerator")?;
        let count = unsafe { enumerator.GetCount() }.context("failed to get session count")?;
        let mut touched = false;

        for index in 0..count {
            let control = unsafe { enumerator.GetSession(index) }
                .with_context(|| format!("failed to get session at index {index}"))?;
            let control2: IAudioSessionControl2 = control.cast().context("failed to cast session control")?;
            let session_pid = unsafe { control2.GetProcessId() }.context("failed to get session pid")?;
            if session_pid != pid {
                continue;
            }

            let volume: ISimpleAudioVolume = control.cast().context("failed to cast simple audio volume")?;
            unsafe { volume.SetMute(mute, null()) }.context("failed to set session mute")?;
            touched = true;
        }

        Ok(touched)
    }
}

fn default_session_manager() -> anyhow::Result<IAudioSessionManager2> {
    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .context("failed to create MMDeviceEnumerator")?;
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia) }
        .context("failed to get default audio endpoint")?;
    unsafe { device.Activate(CLSCTX_ALL, None) }.context("failed to activate audio session manager")
}
