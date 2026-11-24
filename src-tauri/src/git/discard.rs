use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[tauri::command(async)]
pub fn git_discard(repo: String, path: String) -> Result<GitActionResult, GitError> {
    let in_head = run_git(&repo, &["cat-file", "-e", &format!("HEAD:{path}")]).is_ok();
    let output = if in_head {
        run_git(&repo, &["checkout", "HEAD", "--", &path])?
    } else {
        run_git(&repo, &["rm", "-f", "--", &path])
            .or_else(|_| run_git(&repo, &["clean", "-f", "--", &path]))?
    };
    Ok(ok_result(output))
}
