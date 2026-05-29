use std::path::PathBuf;

pub struct ToolRegistry;

impl ToolRegistry {
    pub fn get(tool: &str) -> Result<PathBuf, String> {
        // Placeholder implementation for Phase 1
        // In future phases, this will resolve the tool paths in APPDATA
        Ok(PathBuf::from(tool))
    }
}
