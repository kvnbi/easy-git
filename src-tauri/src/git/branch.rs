use std::collections::HashSet;

use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize, Debug, PartialEq)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
}

fn parse_branches(raw: &str) -> Vec<BranchInfo> {
    let mut seen = HashSet::new();
    let mut branches = Vec::new();

    for line in raw.lines() {
        let Some(refname) = line.get(1..) else {
            continue;
        };
        let name = if let Some(name) = refname.strip_prefix("refs/heads/") {
            name
        } else if let Some(rest) = refname.strip_prefix("refs/remotes/") {
            match rest.split_once('/') {
                Some((_, name)) if name != "HEAD" => name,
                _ => continue,
            }
        } else {
            continue;
        };
        if seen.insert(name.to_string()) {
            branches.push(BranchInfo {
                name: name.to_string(),
                is_current: line.starts_with('*'),
            });
        }
    }

    branches
}

#[tauri::command(async)]
pub fn git_branches(repo: String) -> Result<Vec<BranchInfo>, GitError> {
    let output = run_git(
        &repo,
        &["for-each-ref", "--format=%(HEAD)%(refname)", "refs/heads", "refs/remotes"],
    )?;
    Ok(parse_branches(&output.stdout))
}

#[tauri::command(async)]
pub fn git_checkout_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", &name])?;
    Ok(ok_result(output))
}

#[tauri::command(async)]
pub fn git_create_branch(repo: String, name: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["checkout", "-b", &name])?;
    Ok(ok_result(output))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    #[test]
    fn a_clone_can_see_and_switch_to_branches_that_only_exist_on_the_remote() {
        let source = TempRepo::new("branch-source");
        source.commit("a.txt", "one\n", "first");
        source.git(&["branch", "feature-login"]);
        source.git(&["branch", "feature-signup"]);

        let clone = TempRepo::clone_of(&source, "branch-clone");
        let names: Vec<String> = git_branches(clone.dir())
            .unwrap()
            .into_iter()
            .map(|b| b.name)
            .collect();

        assert!(names.contains(&"feature-login".to_string()));
        assert!(names.contains(&"feature-signup".to_string()));
        assert!(!names.iter().any(|n| n.starts_with("origin/") || n == "HEAD"));

        git_checkout_branch(clone.dir(), "feature-login".to_string()).unwrap();
        let current = git_branches(clone.dir())
            .unwrap()
            .into_iter()
            .find(|b| b.is_current)
            .map(|b| b.name);
        assert_eq!(current, Some("feature-login".to_string()));
    }

    #[test]
    fn a_repo_with_no_commits_lists_no_branches() {
        let repo = TempRepo::new("branch-empty");
        assert_eq!(git_branches(repo.dir()).unwrap(), vec![]);
    }

    #[test]
    fn detached_head_marks_no_branch_current() {
        let repo = TempRepo::new("branch-detached");
        let first = repo.commit("a.txt", "one\n", "first");
        repo.commit("a.txt", "two\n", "second");
        repo.git(&["checkout", &first]);

        let branches = git_branches(repo.dir()).unwrap();
        assert_eq!(branches, vec![BranchInfo { name: "main".to_string(), is_current: false }]);
    }

    #[test]
    fn parses_normal_branches() {
        let branches = parse_branches("*refs/heads/main\n refs/heads/feature-x\n");
        assert_eq!(
            branches,
            vec![
                BranchInfo { name: "main".to_string(), is_current: true },
                BranchInfo { name: "feature-x".to_string(), is_current: false },
            ]
        );
    }

    #[test]
    fn includes_remote_only_branches_by_short_name() {
        let raw = "*refs/heads/main\n refs/remotes/origin/HEAD\n refs/remotes/origin/feature-login\n refs/remotes/origin/main\n";
        assert_eq!(
            parse_branches(raw),
            vec![
                BranchInfo { name: "main".to_string(), is_current: true },
                BranchInfo { name: "feature-login".to_string(), is_current: false },
            ]
        );
    }

    #[test]
    fn keeps_slashes_inside_remote_branch_names() {
        assert_eq!(
            parse_branches(" refs/remotes/origin/feature/login\n"),
            vec![BranchInfo { name: "feature/login".to_string(), is_current: false }]
        );
    }
}
