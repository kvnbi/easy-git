use serde::Serialize;

use crate::exec::{run_git, GitError};
use crate::git::diff::DiffResult;

const FIELD_SEP: &str = "\x1f";

#[derive(Serialize)]
pub struct CommitEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct LogResult {
    pub commits: Vec<CommitEntry>,
    pub command_run: String,
}

#[tauri::command]
pub fn git_log(repo: String) -> Result<LogResult, GitError> {
    let format_arg = format!("--pretty=format:%H{FIELD_SEP}%h{FIELD_SEP}%an{FIELD_SEP}%ad{FIELD_SEP}%s");
    let args: Vec<&str> = vec![
        "log",
        "-n",
        "200",
        &format_arg,
        "--date=format:%Y-%m-%d %H:%M",
    ];
    let output = run_git(&repo, &args)?;
    let commits = output
        .stdout
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(5, FIELD_SEP);
            Some(CommitEntry {
                hash: parts.next()?.to_string(),
                short_hash: parts.next()?.to_string(),
                author: parts.next()?.to_string(),
                date: parts.next()?.to_string(),
                message: parts.next().unwrap_or("").to_string(),
            })
        })
        .collect();
    Ok(LogResult {
        commits,
        command_run: output.command_run,
    })
}

#[tauri::command]
pub fn git_show_commit(repo: String, hash: String) -> Result<DiffResult, GitError> {
    let output = run_git(&repo, &["show", &hash])?;
    Ok(DiffResult {
        diff: output.stdout,
        command_run: output.command_run,
    })
}
