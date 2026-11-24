use serde::Serialize;
use std::process::{Command, Stdio};

#[derive(Serialize, Debug)]
pub struct GitError {
    pub command_run: String,
    pub message: String,
}

pub struct GitOutput {
    pub stdout: String,
    pub stderr: String,
    pub command_run: String,
}

#[derive(Serialize, Debug)]
pub struct GitActionResult {
    pub command_run: String,
    pub stderr: Option<String>,
}

pub fn ok_result(output: GitOutput) -> GitActionResult {
    GitActionResult {
        command_run: output.command_run,
        stderr: if output.stderr.trim().is_empty() {
            None
        } else {
            Some(output.stderr)
        },
    }
}

pub fn run_git(repo: &str, args: &[&str]) -> Result<GitOutput, GitError> {
    let command_run = format!("git {}", args.join(" "));

    let output = Command::new("git")
        .current_dir(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .env("LC_ALL", "C")
        .stdin(Stdio::null())
        .output()
        .map_err(|e| GitError {
            command_run: command_run.clone(),
            message: format!("failed to execute git: {e}"),
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    if !output.status.success() {
        let message = if stderr.trim().is_empty() { stdout } else { stderr };
        return Err(GitError { command_run, message });
    }

    Ok(GitOutput {
        stdout,
        stderr,
        command_run,
    })
}
