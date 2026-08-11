use serde::Serialize;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::status::{parse_status, StatusResult};
use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize)]
pub struct OpenRepoResult {
    pub path: String,
    pub status: StatusResult,
    pub command_run: String,
}

#[tauri::command]
pub fn open_repo(path: String) -> Result<OpenRepoResult, GitError> {
    let git_dir = Path::new(&path).join(".git");
    if !git_dir.exists() {
        return Err(GitError {
            command_run: format!("open {path}"),
            message: format!("{path} doesn't look like a git repository (no .git folder found)"),
        });
    }

    let output = run_git(&path, &["status", "--porcelain=v2", "--branch"])?;
    Ok(OpenRepoResult {
        path,
        status: parse_status(&output.stdout),
        command_run: output.command_run,
    })
}

#[tauri::command]
pub fn git_init(path: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&path, &["init"])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub async fn pick_repo_folder(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}
