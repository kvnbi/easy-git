use serde::Serialize;

use crate::exec::run_git;

#[derive(Serialize)]
pub struct GitConfigInfo {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub credential_helper: Option<String>,
}

fn get_config_value(repo: &str, key: &str) -> Option<String> {
    let output = run_git(repo, &["config", "--get", key]).ok()?;
    let value = output.stdout.trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

#[tauri::command]
pub fn git_config_info(repo: String) -> GitConfigInfo {
    GitConfigInfo {
        user_name: get_config_value(&repo, "user.name"),
        user_email: get_config_value(&repo, "user.email"),
        credential_helper: get_config_value(&repo, "credential.helper"),
    }
}
