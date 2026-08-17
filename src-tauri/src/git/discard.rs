use std::process::Command;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

fn exists_in_head(repo: &str, path: &str) -> bool {
    Command::new("git")
        .current_dir(repo)
        .args(["cat-file", "-e", &format!("HEAD:{path}")])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn git_discard(repo: String, path: String) -> Result<GitActionResult, GitError> {
    let output = if exists_in_head(&repo, &path) {
        run_git(&repo, &["checkout", "HEAD", "--", &path])?
    } else {
        run_git(&repo, &["rm", "-f", "--", &path])
            .or_else(|_| run_git(&repo, &["clean", "-f", "--", &path]))?
    };
    Ok(ok_result(output))
}
