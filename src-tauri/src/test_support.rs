use std::fs;
use std::path::PathBuf;

use crate::exec::run_git;

pub struct TempRepo {
    pub path: PathBuf,
}

impl TempRepo {
    pub fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("easy-git-test-{name}"));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        let repo = TempRepo { path };
        repo.git(&["init"]);
        repo.git(&["config", "user.email", "test@example.com"]);
        repo.git(&["config", "user.name", "Test"]);
        repo.git(&["config", "commit.gpgsign", "false"]);
        repo
    }

    pub fn dir(&self) -> String {
        self.path.to_string_lossy().into_owned()
    }

    pub fn git(&self, args: &[&str]) -> String {
        run_git(&self.dir(), args).unwrap().stdout
    }

    pub fn write(&self, file: &str, contents: &str) {
        fs::write(self.path.join(file), contents).unwrap();
    }

    pub fn commit(&self, file: &str, contents: &str, message: &str) -> String {
        self.write(file, contents);
        self.git(&["add", "."]);
        self.git(&["commit", "-m", message]);
        self.git(&["rev-parse", "HEAD"]).trim().to_string()
    }

    pub fn head_message(&self) -> String {
        self.git(&["log", "-1", "--pretty=format:%s"]).trim().to_string()
    }

    pub fn stash_count(&self) -> usize {
        self.git(&["stash", "list"]).lines().count()
    }
}

impl Drop for TempRepo {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
