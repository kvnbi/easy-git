use serde::Serialize;

use crate::exec::{run_git, GitError};

#[derive(Serialize)]
pub struct DiffResult {
    pub diff: String,
    pub command_run: String,
}

#[tauri::command(async)]
pub fn git_diff(repo: String, path: String, staged: bool) -> Result<DiffResult, GitError> {
    let mut args = vec!["diff", "--no-color", "--no-ext-diff"];
    if staged {
        args.push("--staged");
    }
    args.extend(["--", &path]);
    let output = run_git(&repo, &args)?;
    Ok(DiffResult {
        diff: output.stdout,
        command_run: output.command_run,
    })
}
