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

export function gitStashApply(repo: string, index: number): Promise<GitActionResult> {
  return invoke("git_stash_apply", { repo, index });
}

export function gitStashDrop(repo: string, index: number): Promise<GitActionResult> {
  return invoke("git_stash_drop", { repo, index });
}

export function gitConfigInfo(repo: string): Promise<GitConfigInfo> {
  return invoke("git_config_info", { repo });
}
