use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize, Debug, PartialEq)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
}

fn parse_branches(raw: &str) -> Vec<BranchInfo> {
    raw.lines()
        .filter_map(|line| {
            let line = line.trim_end();
            if line.is_empty() {
                return None;
            }
            let is_current = line.starts_with('*');
            let name = line.trim_start_matches('*').trim().to_string();
            if name.is_empty() {
                return None;
            }
            if name.contains("HEAD detached") || name == "(no branch)" {
                return None;
            }
            Some(BranchInfo { name, is_current })
        })
        .collect()
}

#[tauri::command]
pub fn git_branches(repo: String) -> Result<Vec<BranchInfo>, GitError> {
    let output = run_git(&repo, &["branch", "--list"])?;
    Ok(parse_branches(&output.stdout))
}

#[tauri::command]
pub fn git_checkout_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", &name])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub fn git_create_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", "-b", &name])?;
    Ok(ok_result(output))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_normal_branches() {
        let raw = "* main\n  feature-x\n";
        let branches = parse_branches(raw);
        assert_eq!(
            branches,
            vec![
                BranchInfo { name: "main".to_string(), is_current: true },
                BranchInfo { name: "feature-x".to_string(), is_current: false },
            ]
        );
    }

    #[test]
    fn skips_detached_head_pseudo_branch() {
        let raw = "* (HEAD detached at abc1234)\n  main\n";
        let branches = parse_branches(raw);
        assert_eq!(
            branches,
            vec![BranchInfo { name: "main".to_string(), is_current: false }]
        );
    }

    #[test]
    fn skips_no_branch_pseudo_entry() {
        let raw = "* (no branch)\n  main\n";
        let branches = parse_branches(raw);
        assert_eq!(
            branches,
            vec![BranchInfo { name: "main".to_string(), is_current: false }]
        );
    }
}
