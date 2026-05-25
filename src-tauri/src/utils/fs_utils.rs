use std::fs;
use std::path::PathBuf;

#[tauri::command]
#[specta::specta]
pub fn export_file(file_path: String, content: String) -> Result<(), String> {
    let target_path = PathBuf::from(&file_path);
    fs::write(target_path, content).map_err(|e| e.to_string())
}
