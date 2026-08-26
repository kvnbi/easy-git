use serde::Serialize;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[derive(Serialize, Debug, PartialEq)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
}

fn parse_branches(local: &str, remote: &str) -> Vec<BranchInfo> {
    let mut branches: Vec<BranchInfo> = local
        .lines()
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
        .collect();

    for line in remote.lines() {
        let line = line.trim();
        if line.is_empty() || line.contains("->") {
            continue;
        }
        let name = match line.split_once('/') {
            Some((_, rest)) => rest,
            None => continue,
        };
        if name.is_empty() || branches.iter().any(|b| b.name == name) {
            continue;
        }
        branches.push(BranchInfo {
            name: name.to_string(),
            is_current: false,
        });
    }

    branches
}

#[tauri::command]
pub fn git_branches(repo: String) -> Result<Vec<BranchInfo>, GitError> {
    let local = run_git(&repo, &["branch", "--list"])?;
    let remote = run_git(&repo, &["branch", "--remotes"])?;
    Ok(parse_branches(&local.stdout, &remote.stdout))
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
        assert!(!names.iter().any(|n| n.starts_with("origin/")));

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
    fn parses_normal_branches() {
        let branches = parse_branches("* main\n  feature-x\n", "");
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
        let branches = parse_branches("* (HEAD detached at abc1234)\n  main\n", "");
        assert_eq!(
            branches,
            vec![BranchInfo { name: "main".to_string(), is_current: false }]
        );
    }

    #[test]
    fn skips_no_branch_pseudo_entry() {
        let branches = parse_branches("* (no branch)\n  main\n", "");
        assert_eq!(
            branches,
            vec![BranchInfo { name: "main".to_string(), is_current: false }]
        );
    }

    #[test]
    fn includes_remote_only_branches_by_short_name() {
        let remote = "  origin/HEAD -> origin/main\n  origin/feature-login\n  origin/main\n";
        let branches = parse_branches("* main\n", remote);
        assert_eq!(
            branches,
            vec![
                BranchInfo { name: "main".to_string(), is_current: true },
                BranchInfo { name: "feature-login".to_string(), is_current: false },
            ]
        );
    }

    #[test]
    fn keeps_slashes_inside_remote_branch_names() {
        let branches = parse_branches("", "  origin/feature/login\n");
        assert_eq!(
            branches,
            vec![BranchInfo { name: "feature/login".to_string(), is_current: false }]
        );
    }

    #[test]
    fn lists_remote_branches_when_nothing_is_checked_out() {
        let remote = "  origin/feature-login\n  origin/feature-signup\n";
        let branches = parse_branches("", remote);
        assert_eq!(branches.len(), 2);
        assert!(branches.iter().all(|b| !b.is_current));
    }
}
