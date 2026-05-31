use std::fs;
use std::path::PathBuf;

#[tauri::command]
#[specta::specta]
pub fn export_file(file_path: String, content: String) -> Result<(), String> {
    let target_path = PathBuf::from(&file_path);
    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &content)
        .map_err(|e| e.to_string())?;
    fs::write(target_path, decoded).map_err(|e| e.to_string())
}
