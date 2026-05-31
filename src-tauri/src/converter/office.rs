use std::path::Path;
use tokio::process::Command;
use crate::utils::tool_registry::ToolRegistry;
use crate::error::MorphineError;
use crate::types::{ConversionJob, ConversionProgress};

pub async fn convert(
    job: &ConversionJob,
    progress_tx: tokio::sync::mpsc::Sender<ConversionProgress>,
) -> Result<String, MorphineError> {
    // 1. Validate input file exists
    let input_path = Path::new(&job.input_path);
    if !input_path.exists() {
        return Err(MorphineError::InputNotFound(job.input_path.clone()));
    }

    // 2. Resolve tool path
    let tool_path = ToolRegistry::libreoffice()
        .map_err(|e| MorphineError::RegistryError(e.to_string()))?;

    // 3. Emit initial progress
    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 10,
        message: "Initializing LibreOffice...".into(),
    }).await;

    // 4. Resolve output directory
    let output_path = Path::new(&job.output_path);
    let output_dir = output_path.parent()
        .ok_or_else(|| MorphineError::ConversionFailed("Invalid output directory".into()))?;

    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 35,
        message: "Converting file via LibreOffice...".into(),
    }).await;

    // 5. Spawn external tool
    let program_dir = tool_path.parent()
        .ok_or_else(|| MorphineError::ConversionFailed("Invalid tool path".into()))?;

    let mut args = vec![
        "--headless".to_string(),
    ];

    if job.input_format.eq_ignore_ascii_case("pdf") {
        args.push("--infilter=writer_pdf_import".to_string());
    }

    args.extend(vec![
        "--convert-to".to_string(),
        job.output_format.clone(),
        "--outdir".to_string(),
        output_dir.to_string_lossy().into_owned(),
        job.input_path.clone(),
    ]);

    let output = Command::new(&tool_path)
        .current_dir(program_dir)
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .args(&args)
        .output()
        .await
        .map_err(|e| MorphineError::ToolFailed(e.to_string()))?;

    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 85,
        message: "Verifying output...".into(),
    }).await;

    // 6. Check result
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(MorphineError::ConversionFailed(stderr));
    }

    // Verify output file actually exists
    if !output_path.exists() {
        return Err(MorphineError::ConversionFailed("Output file was not created by LibreOffice".into()));
    }

    // 7. Emit completion
    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 100,
        message: "Done".into(),
    }).await;

    Ok(job.output_path.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_docx_to_pdf_happy_path() {
        let job = ConversionJob {
            id: "test-1".into(),
            input_path: "tests/fixtures/sample.docx".into(),
            output_path: "tests/fixtures/sample.pdf".into(),
            input_format: "docx".into(),
            output_format: "pdf".into(),
        };
        let (tx, _rx) = tokio::sync::mpsc::channel(32);
        let result = convert(&job, tx).await;
        assert!(result.is_ok());
    }
}
