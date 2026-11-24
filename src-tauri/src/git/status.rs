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

fn parse_status(raw: &str) -> StatusResult {
    let mut status = StatusResult {
        branch: None,
        upstream: None,
        ahead: 0,
        behind: 0,
        staged: Vec::new(),
        unstaged: Vec::new(),
        untracked: Vec::new(),
        has_conflicts: false,
    };

    let mut records = raw.split('\0');
    while let Some(record) = records.next() {
        if let Some(rest) = record.strip_prefix("# branch.head ") {
            if rest != "(detached)" {
                status.branch = Some(rest.to_string());
            }
        } else if let Some(rest) = record.strip_prefix("# branch.upstream ") {
            status.upstream = Some(rest.to_string());
        } else if let Some(rest) = record.strip_prefix("# branch.ab ") {
            for part in rest.split_whitespace() {
                if let Some(n) = part.strip_prefix('+') {
                    status.ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = part.strip_prefix('-') {
                    status.behind = n.parse().unwrap_or(0);
                }
            }
        } else if let Some(path) = record.strip_prefix("? ") {
            status.untracked.push(FileEntry {
                path: path.to_string(),
                status: "untracked".to_string(),
                orig_path: None,
            });
        } else if let Some(rest) = record.strip_prefix("1 ") {
            let mut parts = rest.splitn(8, ' ');
            let xy = parts.next().unwrap_or("");
            let path = parts.nth(6).unwrap_or("");
            push_ordinary_entry(&mut status, xy, path, None);
        } else if let Some(rest) = record.strip_prefix("2 ") {
            let mut parts = rest.splitn(9, ' ');
            let xy = parts.next().unwrap_or("");
            let path = parts.nth(7).unwrap_or("");
            push_ordinary_entry(&mut status, xy, path, records.next());
        } else if let Some(rest) = record.strip_prefix("u ") {
            status.has_conflicts = true;
            if let Some(path) = rest.splitn(10, ' ').nth(9) {
                status.staged.push(FileEntry {
                    path: path.to_string(),
                    status: "unmerged".to_string(),
                    orig_path: None,
                });
            }
        }
    }

    status
}

fn push_ordinary_entry(status: &mut StatusResult, xy: &str, path: &str, orig_path: Option<&str>) {
    let mut chars = xy.chars();
    let x = chars.next().unwrap_or('.');
    let y = chars.next().unwrap_or('.');
    let entry = |code| FileEntry {
        path: path.to_string(),
        status: label_for(code).to_string(),
        orig_path: orig_path.map(str::to_string),
    };

    if x != '.' {
        status.staged.push(entry(x));
    }
    if y != '.' {
        status.unstaged.push(entry(y));
    }
}

#[tauri::command(async)]
pub fn git_status(repo: String) -> Result<StatusCommandResult, GitError> {
    let output = run_git(&repo, &["status", "--porcelain=v2", "--branch", "-z"])?;
    Ok(StatusCommandResult {
        status: parse_status(&output.stdout),
        command_run: output.command_run,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    fn entry(path: &str, status: &str, orig_path: Option<&str>) -> FileEntry {
        FileEntry {
            path: path.to_string(),
            status: status.to_string(),
            orig_path: orig_path.map(str::to_string),
        }
    }

    #[test]
    fn parses_branch_and_ahead_behind() {
        let raw = "# branch.oid abc123\0# branch.head main\0# branch.upstream origin/main\0# branch.ab +2 -3\0";
        let status = parse_status(raw);
        assert_eq!(status.branch, Some("main".to_string()));
        assert_eq!(status.upstream, Some("origin/main".to_string()));
        assert_eq!(status.ahead, 2);
        assert_eq!(status.behind, 3);
    }

    #[test]
    fn detached_head_leaves_branch_none() {
        let status = parse_status("# branch.oid abc123\0# branch.head (detached)\0");
        assert_eq!(status.branch, None);
    }

    #[test]
    fn parses_partially_staged_modified_file() {
        let status = parse_status("1 MM N... 100644 100644 100644 aaa bbb file.txt\0");
        assert_eq!(status.staged, vec![entry("file.txt", "modified", None)]);
        assert_eq!(status.unstaged, vec![entry("file.txt", "modified", None)]);
    }

    #[test]
    fn parses_untracked_file() {
        let status = parse_status("? newfile.txt\0");
        assert_eq!(status.untracked, vec![entry("newfile.txt", "untracked", None)]);
    }

    #[test]
    fn parses_renamed_file() {
        let status = parse_status("2 R. N... 100644 100644 100644 aaa bbb R100 new.txt\0old.txt\0? x.txt\0");
        assert_eq!(status.staged, vec![entry("new.txt", "renamed", Some("old.txt"))]);
        assert_eq!(status.untracked, vec![entry("x.txt", "untracked", None)]);
    }

    #[test]
    fn parses_conflicted_file_with_spaces() {
        let status = parse_status("u UU N... 100644 100644 100644 100644 aaa bbb ccc my conflict.txt\0");
        assert!(status.has_conflicts);
        assert_eq!(status.staged, vec![entry("my conflict.txt", "unmerged", None)]);
    }

    #[test]
    fn reports_unusual_file_names_verbatim() {
        let repo = TempRepo::new("status-names");
        repo.write("café notes.txt", "hi\n");
        let status = git_status(repo.dir()).unwrap().status;
        assert_eq!(status.untracked, vec![entry("café notes.txt", "untracked", None)]);
    }
}
