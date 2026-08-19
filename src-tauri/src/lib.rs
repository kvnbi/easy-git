mod exec;
mod git;
#[cfg(test)]
mod test_support;

use git::branch::{git_branches, git_checkout_branch, git_create_branch};
use git::commit::{git_commit, git_stage, git_unstage};
use git::config::git_config_info;
use git::diff::git_diff;
use git::discard::git_discard;
use git::log::{git_log, git_show_commit};
use git::remote::{git_add_remote, git_pull, git_push, git_push_upstream, git_remotes};
use git::repo::{git_init, open_repo, pick_repo_folder};
use git::revert::git_revert;
use git::stash::{git_stash_drop, git_stash_list, git_stash_restore, git_stash_save};
use git::status::git_status;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_repo,
            pick_repo_folder,
            git_init,
            git_status,
            git_stage,
            git_unstage,
            git_discard,
            git_commit,
            git_push,
            git_pull,
            git_remotes,
            git_add_remote,
            git_push_upstream,
            git_branches,
            git_checkout_branch,
            git_create_branch,
            git_diff,
            git_log,
            git_show_commit,
            git_revert,
            git_stash_save,
            git_stash_list,
            git_stash_restore,
            git_stash_drop,
            git_config_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
