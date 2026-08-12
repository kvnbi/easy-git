use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

const FIELD_SEP: &str = "\x1f";

#[derive(Serialize)]
pub struct StashEntry {
    pub index: i32,
    pub message: String,
}

#[derive(Serialize)]
pub struct StashListResult {
    pub stashes: Vec<StashEntry>,
    pub command_run: String,
}

#[tauri::command]
pub fn git_stash_save(repo: String, message: String) -> Result<GitActionResult, GitError> {
    let mut args = vec!["stash", "push", "-u"];
    if !message.trim().is_empty() {
        args.push("-m");
        args.push(&message);
    }
    let output = run_git(&repo, &args)?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_stash_list(repo: String) -> Result<StashListResult, GitError> {
    let format_arg = format!("--pretty=format:%gd{FIELD_SEP}%s");
    let output = run_git(&repo, &["stash", "list", &format_arg])?;
    let stashes = output
        .stdout
        .lines()
        .enumerate()
        .filter_map(|(index, line)| {
            let mut parts = line.splitn(2, FIELD_SEP);
            parts.next()?;
            let message = parts.next().unwrap_or("").to_string();
            Some(StashEntry {
                index: index as i32,
                message,
            })
        })
        .collect();
    Ok(StashListResult {
        stashes,
        command_run: output.command_run,
    })
}

#[tauri::command]
pub fn git_stash_apply(repo: String, index: i32) -> Result<GitActionResult, GitError> {
    let reference = format!("stash@{{{index}}}");
    let output = run_git(&repo, &["stash", "apply", &reference])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_stash_drop(repo: String, index: i32) -> Result<GitActionResult, GitError> {
    let reference = format!("stash@{{{index}}}");
    let output = run_git(&repo, &["stash", "drop", &reference])?;
    Ok(ok_result(output))
}
