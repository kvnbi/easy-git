use serde::Serialize;

use crate::exec::{run_git, GitError};

#[derive(Serialize, Debug, PartialEq)]
pub struct FileEntry {
    pub path: String,
    pub status: String,
    pub orig_path: Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct StatusResult {
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<FileEntry>,
    pub unstaged: Vec<FileEntry>,
    pub untracked: Vec<FileEntry>,
    pub has_conflicts: bool,
}

#[derive(Serialize)]
pub struct StatusCommandResult {
    pub status: StatusResult,
    pub command_run: String,
}

fn label_for(code: char) -> &'static str {
    match code {
        'M' => "modified",
        'A' => "added",
        'D' => "deleted",
        'R' => "renamed",
        'C' => "copied",
        'U' => "unmerged",
        'T' => "type-changed",
        _ => "unknown",
    }
}

pub fn parse_status(raw: &str) -> StatusResult {
    let mut branch = None;
    let mut upstream = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    let mut has_conflicts = false;

    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }

        if let Some(rest) = line.strip_prefix("# branch.head ") {
            if rest != "(detached)" {
                branch = Some(rest.to_string());
            }
        } else if let Some(rest) = line.strip_prefix("# branch.upstream ") {
            upstream = Some(rest.to_string());
        } else if let Some(rest) = line.strip_prefix("# branch.ab ") {
            for part in rest.split_whitespace() {
                if let Some(n) = part.strip_prefix('+') {
                    ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = part.strip_prefix('-') {
                    behind = n.parse().unwrap_or(0);
                }
            }
        } else if let Some(rest) = line.strip_prefix("? ") {
            untracked.push(FileEntry {
                path: rest.to_string(),
                status: "untracked".to_string(),
                orig_path: None,
            });
        } else if let Some(rest) = line.strip_prefix("1 ") {
            let mut parts = rest.splitn(8, ' ');
            let xy = parts.next().unwrap_or("");
            for _ in 0..6 {
                parts.next();
            }
            let path = parts.next().unwrap_or("").to_string();
            push_ordinary_entry(&mut staged, &mut unstaged, xy, path, None);
        } else if let Some(rest) = line.strip_prefix("2 ") {
            let mut parts = rest.splitn(9, ' ');
            let xy = parts.next().unwrap_or("");
            for _ in 0..7 {
                parts.next();
            }
            let path_and_orig = parts.next().unwrap_or("");
            let mut split = path_and_orig.splitn(2, '\t');
            let path = split.next().unwrap_or("").to_string();
            let orig = split.next().map(|s| s.to_string());
            push_ordinary_entry(&mut staged, &mut unstaged, xy, path, orig);
        } else if line.starts_with("u ") {
            has_conflicts = true;
            if let Some(path) = line.split_whitespace().last() {
                staged.push(FileEntry {
                    path: path.to_string(),
                    status: "unmerged".to_string(),
                    orig_path: None,
                });
            }
        }
    }

    StatusResult {
        branch,
        upstream,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        has_conflicts,
    }
}

fn push_ordinary_entry(
    staged: &mut Vec<FileEntry>,
    unstaged: &mut Vec<FileEntry>,
    xy: &str,
    path: String,
    orig_path: Option<String>,
) {
    let mut chars = xy.chars();
    let x = chars.next().unwrap_or('.');
    let y = chars.next().unwrap_or('.');

    if x != '.' {
        staged.push(FileEntry {
            path: path.clone(),
            status: label_for(x).to_string(),
            orig_path: orig_path.clone(),
        });
    }
    if y != '.' {
        unstaged.push(FileEntry {
            path,
            status: label_for(y).to_string(),
            orig_path,
        });
    }
}

#[tauri::command]
pub fn git_status(repo: String) -> Result<StatusCommandResult, GitError> {
    let output = run_git(&repo, &["status", "--porcelain=v2", "--branch"])?;
    Ok(StatusCommandResult {
        status: parse_status(&output.stdout),
        command_run: output.command_run,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_branch_and_ahead_behind() {
        let raw = "# branch.oid abc123\n# branch.head main\n# branch.upstream origin/main\n# branch.ab +2 -3\n";
        let status = parse_status(raw);
        assert_eq!(status.branch, Some("main".to_string()));
        assert_eq!(status.upstream, Some("origin/main".to_string()));
        assert_eq!(status.ahead, 2);
        assert_eq!(status.behind, 3);
    }

    #[test]
    fn detached_head_leaves_branch_none() {
        let raw = "# branch.oid abc123\n# branch.head (detached)\n";
        let status = parse_status(raw);
        assert_eq!(status.branch, None);
    }

    #[test]
    fn parses_partially_staged_modified_file() {
        let raw = "1 MM N... 100644 100644 100644 aaa bbb file.txt\n";
        let status = parse_status(raw);
        assert_eq!(
            status.staged,
            vec![FileEntry {
                path: "file.txt".to_string(),
                status: "modified".to_string(),
                orig_path: None,
            }]
        );
        assert_eq!(
            status.unstaged,
            vec![FileEntry {
                path: "file.txt".to_string(),
                status: "modified".to_string(),
                orig_path: None,
            }]
        );
    }

    #[test]
    fn parses_untracked_file() {
        let raw = "? newfile.txt\n";
        let status = parse_status(raw);
        assert_eq!(
            status.untracked,
            vec![FileEntry {
                path: "newfile.txt".to_string(),
                status: "untracked".to_string(),
                orig_path: None,
            }]
        );
    }

    #[test]
    fn parses_renamed_file() {
        let raw = "2 R. N... 100644 100644 100644 aaa bbb R100 new.txt\told.txt\n";
        let status = parse_status(raw);
        assert_eq!(
            status.staged,
            vec![FileEntry {
                path: "new.txt".to_string(),
                status: "renamed".to_string(),
                orig_path: Some("old.txt".to_string()),
            }]
        );
    }

    #[test]
    fn parses_conflicted_file() {
        let raw =
            "u UU N... 100644 100644 100644 100644 aaa bbb ccc conflict.txt\n";
        let status = parse_status(raw);
        assert!(status.has_conflicts);
        assert_eq!(
            status.staged,
            vec![FileEntry {
                path: "conflict.txt".to_string(),
                status: "unmerged".to_string(),
                orig_path: None,
            }]
        );
    }
}
