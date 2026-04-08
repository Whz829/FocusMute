use anyhow::Context;
use tauri::{image::Image, AppHandle, Runtime};

const TRAY_ICON_SIZE: u32 = 32;
const TRAY_ICON_MUTED: &[u8] = include_bytes!("../tray-icons/tray-muted.rgba");
const TRAY_ICON_UNMUTED: &[u8] = include_bytes!("../tray-icons/tray-unmuted.rgba");

pub fn tray_image(auto_mute_enabled: bool) -> anyhow::Result<Image<'static>> {
    let rgba = if auto_mute_enabled {
        TRAY_ICON_MUTED
    } else {
        TRAY_ICON_UNMUTED
    };

    Ok(Image::new(rgba, TRAY_ICON_SIZE, TRAY_ICON_SIZE).to_owned())
}

pub fn update_tray_icon<R: Runtime>(
    app: &AppHandle<R>,
    auto_mute_enabled: bool,
) -> anyhow::Result<()> {
    let tray = app
        .tray_by_id("focusmute-tray")
        .ok_or_else(|| anyhow::anyhow!("tray icon not found"))?;
    let icon = tray_image(auto_mute_enabled)?;
    tray.set_icon(Some(icon))
        .context("failed to set tray icon")?;
    tray.set_tooltip(Some(if auto_mute_enabled {
        "FocusMute - 自动静音已开启"
    } else {
        "FocusMute - 自动静音已关闭"
    }))
    .context("failed to update tray tooltip")?;
    Ok(())
}
