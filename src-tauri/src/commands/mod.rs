use crate::types::{ConversionJob, ConversionResult};
use crate::utils::tool_registry::ToolRegistry;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn convert_file(
    app: AppHandle,
    job: ConversionJob,
) -> Result<ConversionResult, String> {
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);

    // Forward progress events to frontend via Tauri's event system
    let app_clone = app.clone();
    let job_id = job.id.clone();
    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app_clone.emit("conversion:progress", &progress);
        }
    });

    match crate::converter::office::convert(&job, tx).await {
        Ok(output_path) => Ok(ConversionResult {
            job_id,
            success: true,
            output_path: Some(output_path),
            error: None,
        }),
        Err(e) => Ok(ConversionResult {
            job_id,
            success: false,
            output_path: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn cancel_conversion(_job_id: String) -> Result<(), String> {
    // TRACKED: cancellation token per job_id — implement in Phase 3 (issue: cancel-conversion)
    Ok(())
}

#[tauri::command]
pub async fn get_tool_status() -> Result<Vec<(String, bool)>, String> {
    let libreoffice_ready = ToolRegistry::libreoffice().is_ok();
    let imagemagick_ready = ToolRegistry::imagemagick().is_ok();
    let ghostscript_ready = ToolRegistry::ghostscript().is_ok();

    Ok(vec![
        ("libreoffice".to_string(), libreoffice_ready),
        ("imagemagick".to_string(), imagemagick_ready),
        ("ghostscript".to_string(), ghostscript_ready),
    ])
}
