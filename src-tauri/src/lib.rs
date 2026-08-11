mod exec;
mod git;

use git::branch::{git_branches, git_checkout_branch, git_create_branch};
use git::commit::{git_commit, git_stage, git_unstage};
use git::diff::git_diff;
use git::remote::{git_pull, git_push};
use git::repo::{git_init, open_repo, pick_repo_folder};
use git::status::git_status;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_repo,
            pick_repo_folder,
            git_init,
            git_status,
            git_stage,
            git_unstage,
            git_commit,
            git_push,
            git_pull,
            git_branches,
            git_checkout_branch,
            git_create_branch,
            git_diff,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
