use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[tauri::command]
pub fn git_push(repo: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["push"])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_pull(repo: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["pull"])?;
    Ok(ok_result(output))
}
