use std::{collections::HashMap, ptr::null_mut};

use sysinfo::{ProcessesToUpdate, System};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub exe_name: String,
    pub exe_path: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SystemSnapshot {
    pub foreground_pid: Option<u32>,
    pub foreground_exe_name: Option<String>,
    pub processes: Vec<ProcessInfo>,
}

pub struct ProcessProbe {
    system: System,
}

impl ProcessProbe {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    pub fn sample(&mut self) -> SystemSnapshot {
        self.system.refresh_processes(ProcessesToUpdate::All, true);

        let foreground_pid = foreground_pid();
        let mut processes = self
            .system
            .processes()
            .iter()
            .map(|(pid, process)| {
                let exe_path = process.exe().map(|path| path.display().to_string());
                let exe_name = exe_path
                    .as_ref()
                    .and_then(|path| path.rsplit(['\\', '/']).next())
                    .map(|name| name.to_ascii_lowercase())
                    .unwrap_or_else(|| format!("{}.exe", process.name().to_string_lossy().to_ascii_lowercase()));

                ProcessInfo {
                    pid: pid.as_u32(),
                    name: process.name().to_string_lossy().to_string(),
                    exe_name,
                    exe_path,
                }
            })
            .collect::<Vec<_>>();

        processes.sort_by(|left, right| {
            let left_foreground = Some(left.pid) == foreground_pid;
            let right_foreground = Some(right.pid) == foreground_pid;
            right_foreground
                .cmp(&left_foreground)
                .then_with(|| left.name.to_ascii_lowercase().cmp(&right.name.to_ascii_lowercase()))
        });

        let foreground_exe_name = foreground_pid.and_then(|pid| {
            processes
                .iter()
                .find(|process| process.pid == pid)
                .map(|process| process.exe_name.clone())
        });

        SystemSnapshot {
            foreground_pid,
            foreground_exe_name,
            processes,
        }
    }
}

pub fn process_lookup(snapshot: &SystemSnapshot) -> HashMap<u32, ProcessInfo> {
    snapshot
        .processes
        .iter()
        .cloned()
        .map(|process| (process.pid, process))
        .collect()
}

fn foreground_pid() -> Option<u32> {
    unsafe {
        let window = GetForegroundWindow();
        if window.0 == null_mut() {
            return None;
        }

        let mut pid = 0_u32;
        GetWindowThreadProcessId(window, Some(&mut pid));
        (pid != 0).then_some(pid)
    }
}
