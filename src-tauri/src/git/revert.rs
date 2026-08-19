use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[tauri::command]
pub fn git_revert(repo: String, hash: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&repo, &["revert", "--no-edit", &hash])?;
    Ok(ok_result(output))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;
    use std::fs;

    #[test]
    fn revert_undoes_the_commit_and_keeps_history() {
        let repo = TempRepo::new("revert-ok");
        repo.commit("a.txt", "first\n", "first");
        let target = repo.commit("b.txt", "second\n", "add b");

        let result = git_revert(repo.dir(), target.clone()).unwrap();

        assert_eq!(result.command_run, format!("git revert --no-edit {target}"));
        assert_eq!(repo.head_message(), "Revert \"add b\"");
        assert!(!repo.path.join("b.txt").exists());
        assert_eq!(repo.git(&["rev-list", "--count", "HEAD"]).trim(), "3");
    }

    #[test]
    fn revert_of_a_merge_commit_fails_with_a_mappable_message() {
        let repo = TempRepo::new("revert-merge");
        repo.commit("a.txt", "first\n", "first");
        repo.git(&["checkout", "-b", "feature"]);
        repo.commit("f.txt", "feature\n", "feature work");
        repo.git(&["checkout", "-"]);
        repo.git(&["merge", "--no-ff", "feature", "-m", "Merge feature"]);
        let merge = repo.git(&["rev-parse", "HEAD"]).trim().to_string();

        let err = git_revert(repo.dir(), merge).unwrap_err();

        assert!(err.message.contains("is a merge but no -m option was given"));
    }

    #[test]
    fn revert_blocked_by_staged_changes_fails_with_a_mappable_message() {
        let repo = TempRepo::new("revert-dirty");
        repo.commit("a.txt", "first\n", "first");
        let target = repo.commit("a.txt", "second\n", "change a");
        fs::write(repo.path.join("a.txt"), "local edit\n").unwrap();
        repo.git(&["add", "."]);

        let err = git_revert(repo.dir(), target).unwrap_err();

        assert!(err.message.contains("would be overwritten by revert"));
    }
}
