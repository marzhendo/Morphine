use std::path::PathBuf;
use crate::error::MorphineError;

/// Resolves paths to external tools stored under %APPDATA%\Morphine\tools\
pub struct ToolRegistry;

impl ToolRegistry {
    fn tools_dir() -> PathBuf {
        let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(app_data).join("Morphine").join("tools")
    }

    pub fn libreoffice() -> Result<PathBuf, MorphineError> {
        let path = Self::tools_dir()
            .join("LibreOfficePortable")  // <-- kapital, sesuai folder aktual
            .join("App")
            .join("libreoffice")
            .join("program")
            .join("soffice.exe");

        if path.exists() {
            Ok(path)
        } else {
            Err(MorphineError::RegistryError(
                format!("LibreOffice (looked at: {})", path.display())
            ))
        }
    }

    pub fn imagemagick() -> Result<PathBuf, MorphineError> {
        let path = Self::tools_dir()
            .join("ImageMagick")
            .join("magick.exe");

        if path.exists() {
            Ok(path)
        } else {
            Err(MorphineError::RegistryError("ImageMagick".to_string()))
        }
    }

    pub fn ghostscript() -> Result<PathBuf, MorphineError> {
        let path = Self::tools_dir()
            .join("Ghostscript")
            .join("bin")
            .join("gswin64c.exe");

        if path.exists() {
            Ok(path)
        } else {
            Err(MorphineError::RegistryError("Ghostscript".to_string()))
        }
    }

    pub fn status() -> Vec<(&'static str, bool)> {
        vec![
            ("libreoffice", Self::libreoffice().is_ok()),
            ("imagemagick",  Self::imagemagick().is_ok()),
            ("ghostscript",  Self::ghostscript().is_ok()),
        ]
    }
}