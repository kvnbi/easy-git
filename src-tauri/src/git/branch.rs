use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
}

#[tauri::command]
pub fn git_branches(repo: String) -> Result<Vec<BranchInfo>, GitError> {
    let output = run_git(&repo, &["branch", "--list"])?;
    let branches = output
        .stdout
        .lines()
        .filter_map(|line| {
            let line = line.trim_end();
            if line.is_empty() {
                return None;
            }
            let is_current = line.starts_with('*');
            let name = line.trim_start_matches('*').trim().to_string();
            if name.is_empty() {
                return None;
            }
            Some(BranchInfo { name, is_current })
        })
        .collect();
    Ok(branches)
}

#[tauri::command]
pub fn git_checkout_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", &name])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_create_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", "-b", &name])?;
    Ok(ok_result(output))
}
