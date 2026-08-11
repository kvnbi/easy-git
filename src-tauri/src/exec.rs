use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct GitError {
    pub command_run: String,
    pub message: String,
}

pub struct GitOutput {
    pub stdout: String,
    pub stderr: String,
    pub command_run: String,
}

#[derive(Serialize)]
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

fn command_string(args: &[&str]) -> String {
    format!("git {}", args.join(" "))
}

pub fn run_git(repo: &str, args: &[&str]) -> Result<GitOutput, GitError> {
    let command_run = command_string(args);

    let output = Command::new("git")
        .current_dir(repo)
        .args(args)
        .output()
        .map_err(|e| GitError {
            command_run: command_run.clone(),
            message: format!("failed to execute git: {e}"),
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    if !output.status.success() {
        let message = if stderr.trim().is_empty() {
            stdout.clone()
        } else {
            stderr.clone()
        };
        return Err(GitError { command_run, message });
    }

    Ok(GitOutput {
        stdout,
        stderr,
        command_run,
    })
}
