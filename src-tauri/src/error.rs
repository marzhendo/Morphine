use thiserror::Error;

#[derive(Error, Debug)]
pub enum MorphineError {
    #[error("Input file not found: {0}")]
    InputNotFound(String),
    #[error("External tool failed: {0}")]
    ToolFailed(String),
    #[error("Conversion process failed: {0}")]
    ConversionFailed(String),
    #[error("Registry error: {0}")]
    RegistryError(String),
}
