import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  path: string;
  status: string;
  orig_path: string | null;
}

export interface StatusResult {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: FileEntry[];
  unstaged: FileEntry[];
  untracked: FileEntry[];
  has_conflicts: boolean;
}

export interface OpenRepoResult {
  path: string;
  status: StatusResult;
  command_run: string;
}

export interface StatusCommandResult {
  status: StatusResult;
  command_run: string;
}

export interface GitActionResult {
  command_run: string;
  stderr: string | null;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
}

export interface DiffResult {
  diff: string;
  command_run: string;
}

export interface CommitEntry {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}

export interface LogResult {
  commits: CommitEntry[];
  command_run: string;
}

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface StashEntry {
  index: number;
  message: string;
}

export interface StashListResult {
  stashes: StashEntry[];
  command_run: string;
}

export interface GitConfigInfo {
  user_name: string | null;
  user_email: string | null;
  credential_helper: string | null;
}

export interface GitError {
  command_run: string;
  message: string;
}

export function isGitError(err: unknown): err is GitError {
  return (
    typeof err === "object" &&
    err !== null &&
    "command_run" in err &&
    "message" in err
  );
}

export function isNotARepoError(err: unknown): boolean {
  return isGitError(err) && err.message.includes("doesn't look like a git repository");
}

const friendlyErrorPatterns: [string, string][] = [
  ["no upstream branch", "This branch has no remote to push to yet."],
  ["Updates were rejected because the remote contains work", "Someone else pushed changes. Pull first, then push again."],
  ["[rejected]", "Someone else pushed changes. Pull first, then push again."],
  ["is a merge but no -m option was given", "This commit merged two branches. easy-git cannot undo those yet."],
  ["would be overwritten by revert", "Save or stash your changes first, then undo this commit."],
  ["would be overwritten by checkout", "Switching branches would overwrite unsaved changes. Save or stash them first."],
  ["Please commit your changes or stash them", "Switching branches would overwrite unsaved changes. Save or stash them first."],
  ["Automatic merge failed", "This created a conflict. Resolve it, then save."],
  ["CONFLICT", "This created a conflict. Resolve it, then save."],
  ["Could not resolve host", "Could not reach the remote. Check your internet connection."],
  ["Could not read from remote repository", "Could not reach the remote. Check your internet connection."],
  ["Permission denied (publickey)", "Access to the remote was denied. Check your Git credentials."],
  ["Authentication failed", "Access to the remote was denied. Check your Git credentials."],
];

export function friendlyErrorMessage(message: string): string | null {
  for (const [pattern, friendly] of friendlyErrorPatterns) {
    if (message.includes(pattern)) return friendly;
  }
  return null;
}

export function pickRepoFolder(): Promise<string | null> {
  return invoke("pick_repo_folder");
}

export function openRepo(path: string): Promise<OpenRepoResult> {
  return invoke("open_repo", { path });
}

export function gitInit(path: string): Promise<GitActionResult> {
  return invoke("git_init", { path });
}

export function gitStatus(repo: string): Promise<StatusCommandResult> {
  return invoke("git_status", { repo });
}

export function gitStage(repo: string, paths: string[]): Promise<GitActionResult> {
  return invoke("git_stage", { repo, paths });
}

export function gitUnstage(repo: string, paths: string[]): Promise<GitActionResult> {
  return invoke("git_unstage", { repo, paths });
}

export function gitDiscard(repo: string, path: string): Promise<GitActionResult> {
  return invoke("git_discard", { repo, path });
}

export function gitCommit(repo: string, message: string): Promise<GitActionResult> {
  return invoke("git_commit", { repo, message });
}

export function gitPush(repo: string): Promise<GitActionResult> {
  return invoke("git_push", { repo });
}

export function gitPull(repo: string): Promise<GitActionResult> {
  return invoke("git_pull", { repo });
}

export function gitBranches(repo: string): Promise<BranchInfo[]> {
  return invoke("git_branches", { repo });
}

export function gitCheckoutBranch(repo: string, name: string): Promise<GitActionResult> {
  return invoke("git_checkout_branch", { repo, name });
}

export function gitCreateBranch(repo: string, name: string): Promise<GitActionResult> {
  return invoke("git_create_branch", { repo, name });
}

export function gitDiff(repo: string, path: string, staged: boolean): Promise<DiffResult> {
  return invoke("git_diff", { repo, path, staged });
}

export function gitLog(repo: string): Promise<LogResult> {
  return invoke("git_log", { repo });
}

export function gitShowCommit(repo: string, hash: string): Promise<DiffResult> {
  return invoke("git_show_commit", { repo, hash });
}

export function gitRevert(repo: string, hash: string): Promise<GitActionResult> {
  return invoke("git_revert", { repo, hash });
}

export function gitRemotes(repo: string): Promise<RemoteInfo[]> {
  return invoke("git_remotes", { repo });
}

export function gitAddRemote(repo: string, name: string, url: string): Promise<GitActionResult> {
  return invoke("git_add_remote", { repo, name, url });
}

export function gitPushUpstream(
  repo: string,
  remote: string,
  branch: string,
): Promise<GitActionResult> {
  return invoke("git_push_upstream", { repo, remote, branch });
}

export function gitStashSave(repo: string, message: string): Promise<GitActionResult> {
  return invoke("git_stash_save", { repo, message });
}

export function gitStashList(repo: string): Promise<StashListResult> {
  return invoke("git_stash_list", { repo });
}

export function gitStashRestore(repo: string, index: number): Promise<GitActionResult> {
  return invoke("git_stash_restore", { repo, index });
}

export function gitStashDrop(repo: string, index: number): Promise<GitActionResult> {
  return invoke("git_stash_drop", { repo, index });
}

export function gitConfigInfo(repo: string): Promise<GitConfigInfo> {
  return invoke("git_config_info", { repo });
}
