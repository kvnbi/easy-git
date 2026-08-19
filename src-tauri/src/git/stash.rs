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
pub fn git_stash_restore(repo: String, index: i32) -> Result<GitActionResult, GitError> {
    let reference = format!("stash@{{{index}}}");
    let output = run_git(&repo, &["stash", "pop", &reference])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_stash_drop(repo: String, index: i32) -> Result<GitActionResult, GitError> {
    let reference = format!("stash@{{{index}}}");
    let output = run_git(&repo, &["stash", "drop", &reference])?;
    Ok(ok_result(output))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    #[test]
    fn restore_brings_work_back_and_removes_the_entry() {
        let repo = TempRepo::new("stash-restore");
        repo.commit("a.txt", "base\n", "first");
        repo.write("a.txt", "my work\n");
        git_stash_save(repo.dir(), "wip".to_string()).unwrap();
        assert_eq!(repo.stash_count(), 1);
        assert_eq!(std::fs::read_to_string(repo.path.join("a.txt")).unwrap(), "base\n");

        git_stash_restore(repo.dir(), 0).unwrap();

        assert_eq!(std::fs::read_to_string(repo.path.join("a.txt")).unwrap(), "my work\n");
        assert_eq!(repo.stash_count(), 0);
    }

    #[test]
    fn restore_keeps_the_entry_when_it_conflicts() {
        let repo = TempRepo::new("stash-conflict");
        repo.commit("a.txt", "base\n", "first");
        repo.write("a.txt", "my work\n");
        git_stash_save(repo.dir(), "wip".to_string()).unwrap();
        repo.commit("a.txt", "someone else\n", "conflicting commit");

        let err = git_stash_restore(repo.dir(), 0).unwrap_err();

        assert!(err.message.contains("CONFLICT"));
        assert_eq!(repo.stash_count(), 1);
    }

    #[test]
    fn drop_removes_the_entry_without_touching_files() {
        let repo = TempRepo::new("stash-drop");
        repo.commit("a.txt", "base\n", "first");
        repo.write("a.txt", "my work\n");
        git_stash_save(repo.dir(), "wip".to_string()).unwrap();

        git_stash_drop(repo.dir(), 0).unwrap();

        assert_eq!(repo.stash_count(), 0);
        assert_eq!(std::fs::read_to_string(repo.path.join("a.txt")).unwrap(), "base\n");
    }
}
