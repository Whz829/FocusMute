use std::mem::size_of;

use anyhow::{anyhow, Context};
use windows::Win32::{
    Graphics::Gdi::{
        DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC, BITMAP, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HBITMAP, HDC, HGDIOBJ,
    },
    Storage::FileSystem::FILE_ATTRIBUTE_NORMAL,
    UI::{
        Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_FLAGS, SHGFI_ICON, SHGFI_SMALLICON},
        WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO},
    },
};

pub fn extract_process_icon_data_url(path: &str) -> anyhow::Result<String> {
    let rgba_bmp = extract_icon_bmp(path)?;
    Ok(format!("data:image/bmp;base64,{}", base64_encode(&rgba_bmp)))
}

fn extract_icon_bmp(path: &str) -> anyhow::Result<Vec<u8>> {
    let hicon = file_icon_handle(path)?;
    let pixels = icon_to_bgra(&hicon)?;
    Ok(build_bmp(pixels.width, pixels.height, &pixels.bgra))
}

fn file_icon_handle(path: &str) -> anyhow::Result<OwnedIcon> {
    let path_wide = to_wide(path);
    let mut file_info = SHFILEINFOW::default();

    let result = unsafe {
        SHGetFileInfoW(
            windows::core::PCWSTR(path_wide.as_ptr()),
            FILE_ATTRIBUTE_NORMAL,
            Some(&mut file_info),
            size_of::<SHFILEINFOW>() as u32,
            SHGFI_FLAGS(SHGFI_ICON.0 | SHGFI_SMALLICON.0),
        )
    };

    if result == 0 || file_info.hIcon.0.is_null() {
        return Err(anyhow!("failed to extract icon handle for {}", path));
    }

    Ok(OwnedIcon(file_info.hIcon))
}

struct IconPixels {
    width: i32,
    height: i32,
    bgra: Vec<u8>,
}

fn icon_to_bgra(icon: &OwnedIcon) -> anyhow::Result<IconPixels> {
    let mut info = ICONINFO::default();
    unsafe { GetIconInfo(icon.0, &mut info) }.context("failed to read icon info")?;
    let color_bitmap = OwnedBitmap(info.hbmColor);
    let _mask_bitmap = OwnedBitmap(info.hbmMask);

    if color_bitmap.0.is_invalid() {
        return Err(anyhow!("icon did not expose a color bitmap"));
    }

    let mut bitmap = BITMAP::default();
    let object_size = unsafe {
        GetObjectW(
            HGDIOBJ(color_bitmap.0.0),
            size_of::<BITMAP>() as i32,
            Some((&mut bitmap as *mut BITMAP).cast()),
        )
    };
    if object_size == 0 {
        return Err(anyhow!("failed to inspect icon bitmap"));
    }

    let width = bitmap.bmWidth;
    let height = bitmap.bmHeight;
    let mut info_header = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width,
            biHeight: -height,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut pixels = vec![0_u8; (width * height * 4) as usize];
    let screen_dc = ScreenDc::new().context("failed to acquire screen dc")?;
    let scan_lines = unsafe {
        GetDIBits(
            screen_dc.0,
            color_bitmap.0,
            0,
            height as u32,
            Some(pixels.as_mut_ptr().cast()),
            &mut info_header,
            DIB_RGB_COLORS,
        )
    };
    if scan_lines == 0 {
        return Err(anyhow!("failed to copy icon bitmap pixels"));
    }

    Ok(IconPixels {
        width,
        height,
        bgra: pixels,
    })
}

fn build_bmp(width: i32, height: i32, bgra_top_down: &[u8]) -> Vec<u8> {
    let width_usize = width as usize;
    let height_usize = height as usize;
    let pixel_bytes = (width_usize * height_usize * 4) as u32;
    let header_size = 14_u32 + 40_u32;
    let file_size = header_size + pixel_bytes;

    let mut bytes = Vec::with_capacity(file_size as usize);
    bytes.extend_from_slice(&0x4D42_u16.to_le_bytes());
    bytes.extend_from_slice(&file_size.to_le_bytes());
    bytes.extend_from_slice(&0_u16.to_le_bytes());
    bytes.extend_from_slice(&0_u16.to_le_bytes());
    bytes.extend_from_slice(&header_size.to_le_bytes());

    bytes.extend_from_slice(&40_u32.to_le_bytes());
    bytes.extend_from_slice(&width.to_le_bytes());
    bytes.extend_from_slice(&height.to_le_bytes());
    bytes.extend_from_slice(&1_u16.to_le_bytes());
    bytes.extend_from_slice(&32_u16.to_le_bytes());
    bytes.extend_from_slice(&0_u32.to_le_bytes());
    bytes.extend_from_slice(&pixel_bytes.to_le_bytes());
    bytes.extend_from_slice(&0_i32.to_le_bytes());
    bytes.extend_from_slice(&0_i32.to_le_bytes());
    bytes.extend_from_slice(&0_u32.to_le_bytes());
    bytes.extend_from_slice(&0_u32.to_le_bytes());

    let stride = width_usize * 4;
    for row in (0..height_usize).rev() {
        let start = row * stride;
        let end = start + stride;
        bytes.extend_from_slice(&bgra_top_down[start..end]);
    }

    bytes
}

fn to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let a = chunk[0];
        let b = *chunk.get(1).unwrap_or(&0);
        let c = *chunk.get(2).unwrap_or(&0);
        let triple = ((a as u32) << 16) | ((b as u32) << 8) | (c as u32);

        output.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        output.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        output.push(if chunk.len() > 1 {
            TABLE[((triple >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        output.push(if chunk.len() > 2 {
            TABLE[(triple & 0x3F) as usize] as char
        } else {
            '='
        });
    }

    output
}

struct OwnedIcon(HICON);

impl Drop for OwnedIcon {
    fn drop(&mut self) {
        if !self.0.0.is_null() {
            unsafe {
                let _ = DestroyIcon(self.0);
            }
        }
    }
}

struct OwnedBitmap(HBITMAP);

impl Drop for OwnedBitmap {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = DeleteObject(HGDIOBJ(self.0.0));
            }
        }
    }
}

struct ScreenDc(HDC);

impl ScreenDc {
    fn new() -> Option<Self> {
        let dc = unsafe { GetDC(None) };
        (!dc.is_invalid()).then_some(Self(dc))
    }
}

impl Drop for ScreenDc {
    fn drop(&mut self) {
        unsafe {
            let _ = ReleaseDC(None, self.0);
        }
    }
}
