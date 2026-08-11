use serde::Serialize;

use crate::exec::{run_git, GitError};

#[derive(Serialize)]
pub struct DiffResult {
    pub diff: String,
    pub command_run: String,
}

#[tauri::command]
pub fn git_diff(repo: String, path: String, staged: bool) -> Result<DiffResult, GitError> {
    let args: Vec<&str> = if staged {
        vec!["diff", "--staged", "--", &path]
    } else {
        vec!["diff", "--", &path]
    };
    let output = run_git(&repo, &args)?;
    Ok(DiffResult {
        diff: output.stdout,
        command_run: output.command_run,
    })
}
