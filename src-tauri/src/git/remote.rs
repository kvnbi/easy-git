use std::collections::HashSet;

use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

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

#[tauri::command]
pub fn git_remotes(repo: String) -> Result<Vec<RemoteInfo>, GitError> {
    let output = run_git(&repo, &["remote", "-v"])?;
    let mut seen = HashSet::new();
    let remotes = output
        .stdout
        .lines()
        .filter_map(|line| {
            let mut parts = line.split_whitespace();
            let name = parts.next()?.to_string();
            let url = parts.next()?.to_string();
            seen.insert(name.clone()).then_some(RemoteInfo { name, url })
        })
        .collect();
    Ok(remotes)
}

#[tauri::command]
pub fn git_add_remote(repo: String, name: String, url: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["remote", "add", &name, &url])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_push_upstream(
    repo: String,
    remote: String,
    branch: String,
) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["push", "-u", &remote, &branch])?;
    Ok(ok_result(output))
}
