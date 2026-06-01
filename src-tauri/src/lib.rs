pub mod commands;
pub mod converter;
pub mod downloader;
pub mod error;
pub mod types;
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::convert_file,
            commands::cancel_conversion,
            commands::get_tool_status,
            commands::download_tool
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
