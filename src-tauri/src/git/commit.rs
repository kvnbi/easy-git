use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[tauri::command]
pub fn git_stage(repo: String, paths: Vec<String>) -> Result<GitActionResult, GitError> {
    let mut args = vec!["add", "--"];
    args.extend(paths.iter().map(|s| s.as_str()));
    let output = run_git(&repo, &args)?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_unstage(repo: String, paths: Vec<String>) -> Result<GitActionResult, GitError> {
    let mut args = vec!["reset", "--"];
    args.extend(paths.iter().map(|s| s.as_str()));
    let output = run_git(&repo, &args)?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_commit(repo: String, message: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["commit", "-m", &message])?;
    Ok(ok_result(output))
}
