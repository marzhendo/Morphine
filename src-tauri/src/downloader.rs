use std::path::{Path, PathBuf};
use std::process::Command;
use futures_util::StreamExt;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tauri::{AppHandle, Emitter};
use crate::error::MorphineError;
use crate::utils::tool_registry::ToolRegistry;

const LO_URL: &str = "https://download.documentfoundation.org/libreoffice/portable/24.8.4/LibreOfficePortable_24.8.4_MultilingualStandard.paf.exe";
const IM_URL: &str = "https://imagemagick.org/archive/binaries/ImageMagick-7.1.1-43-portable-Q16-x64.zip";
const GS_URL: &str = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10031/gs10031w64.exe";

pub async fn download_and_install(
    app: AppHandle,
    tool_name: String,
) -> Result<(), MorphineError> {
    let tools_dir = ToolRegistry::tools_dir_pub();
    fs::create_dir_all(&tools_dir).await?;

    let (url, filename) = match tool_name.as_str() {
        "libreoffice"  => (LO_URL, "lo-installer.paf.exe"),
        "imagemagick"  => (IM_URL, "imagemagick.zip"),
        "ghostscript"  => (GS_URL, "gs-installer.exe"),
        _ => return Err(MorphineError::DownloadFailed(format!("Unknown tool: {}", tool_name))),
    };

    let temp_path = tools_dir.join(filename);

    // Download dengan progress streaming
    emit_progress(&app, &tool_name, 0, "Starting download...", 0, 0);
    download_file(url, &temp_path, &app, &tool_name).await?;

    // Install
    emit_progress(&app, &tool_name, 95, "Installing...", 0, 0);
    install_tool(&tool_name, &temp_path, &tools_dir).await?;

    // Cleanup temp file
    fs::remove_file(&temp_path).await.ok();

    emit_progress(&app, &tool_name, 100, "Done", 0, 0);
    Ok(())
}

async fn download_file(
    url: &str,
    dest: &Path,
    app: &AppHandle,
    tool_name: &str,
) -> Result<(), MorphineError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| MorphineError::DownloadFailed(e.to_string()))?;

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = tokio::fs::File::create(dest).await?;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| MorphineError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let percent = if total > 0 {
            ((downloaded as f64 / total as f64) * 90.0) as u8
        } else {
            0
        };

        let mb_done  = downloaded / 1_048_576;
        let mb_total = total / 1_048_576;
        emit_progress(
            app, tool_name, percent,
            &format!("Downloading... {}MB / {}MB", mb_done, mb_total),
            downloaded, total,
        );
    }

    Ok(())
}

async fn install_tool(
    tool_name: &str,
    installer: &Path,
    tools_dir: &PathBuf,
) -> Result<(), MorphineError> {
    match tool_name {
        "libreoffice" => {
            // LibreOffice PortableApps: jalankan dengan /DESTINATION flag
            let dest = tools_dir.to_string_lossy().to_string();
            let status = Command::new(installer)
                .args(["/DESTINATION", &dest, "/SILENT"])
                .status()
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            if !status.success() {
                return Err(MorphineError::InstallFailed("LibreOffice installer failed".into()));
            }
        }
        "imagemagick" => {
            // ImageMagick: extract ZIP ke tools\ImageMagick\
            let dest = tools_dir.join("ImageMagick");
            std::fs::create_dir_all(&dest)?;
            let file = std::fs::File::open(installer)?;
            let mut archive = zip::ZipArchive::new(file)
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            archive.extract(&dest)
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
        }
        "ghostscript" => {
            // Ghostscript: silent install ke tools\Ghostscript\
            let dest = tools_dir.join("Ghostscript").to_string_lossy().to_string();
            let status = Command::new(installer)
                .args(["/S", &format!("/D={}", dest)])
                .status()
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            if !status.success() {
                return Err(MorphineError::InstallFailed("Ghostscript installer failed".into()));
            }
        }
        _ => {}
    }
    Ok(())
}

fn emit_progress(
    app: &AppHandle,
    tool: &str,
    percent: u8,
    message: &str,
    bytes_done: u64,
    bytes_total: u64,
) {
    app.emit("tool:download-progress", crate::types::DownloadProgress {
        tool:        tool.to_string(),
        percent,
        message:     message.to_string(),
        bytes_done,
        bytes_total,
    }).ok();
}
