use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::exec::{ok_result, run_git, GitActionResult, GitError};

#[tauri::command(async)]
pub fn open_repo(path: String) -> Result<String, GitError> {
    match run_git(&path, &["rev-parse", "--show-toplevel"]) {
        Ok(output) => Ok(output.stdout.trim_end().to_string()),
        Err(err) if err.message.contains("not a git repository") => Err(GitError {
            command_run: err.command_run,
            message: format!("{path} doesn't look like a git repository"),
        }),
        Err(err) => Err(err),
    }
}

#[tauri::command(async)]
pub fn git_init(path: String) -> Result<GitActionResult, GitError> {
    let output = run_git(&path, &["init", "-b", "main"])?;
    Ok(ok_result(output))
}

#[tauri::command]
pub async fn pick_repo_folder(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::TempRepo;

    #[test]
    fn opening_a_subfolder_opens_the_whole_repo() {
        let repo = TempRepo::new("open-sub");
        std::fs::create_dir_all(repo.path.join("src/deep")).unwrap();
        let root = open_repo(repo.path.join("src/deep").to_string_lossy().into_owned()).unwrap();
        assert_eq!(
            std::fs::canonicalize(root).unwrap(),
            std::fs::canonicalize(&repo.path).unwrap()
        );
    }

    #[test]
    fn opening_a_plain_folder_reports_not_a_repo() {
        let dir = std::env::temp_dir().join("easy-git-test-plain-folder");
        std::fs::create_dir_all(&dir).unwrap();
        let err = open_repo(dir.to_string_lossy().into_owned()).unwrap_err();
        std::fs::remove_dir_all(&dir).unwrap();
        assert!(err.message.contains("doesn't look like a git repository"));
    }
}
