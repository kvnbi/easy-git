import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as git from "../api/git";
import type { BranchInfo, GitActionResult, RemoteInfo, StatusResult } from "../api/git";

export interface SelectedFile {
  path: string;
  staged: boolean;
}

export interface ChangedFile {
  path: string;
  status: string;
  orig_path: string | null;
}

export function displayStatus(status: string): string {
  return status === "unmerged" ? "conflict" : status;
}

export interface LogEntry {
  command: string;
  error?: string;
}

interface RepoContextValue {
  repoPath: string | null;
  status: StatusResult | null;
  branches: BranchInfo[];
  remotes: RemoteInfo[];
  changedFiles: ChangedFile[];
  refreshCount: number;
  uncheckedPaths: Set<string>;
  selectedFile: SelectedFile | null;
  commandLog: LogEntry[];
  errorMessage: string | null;
  notARepoPath: string | null;
  busy: boolean;
  pickAndOpenRepo: () => Promise<void>;
  refresh: () => Promise<void>;
  initRepo: () => Promise<void>;
  toggleChecked: (path: string) => void;
  save: (message: string) => Promise<boolean>;
  push: () => Promise<boolean>;
  pull: () => Promise<boolean>;
  checkoutBranch: (name: string) => Promise<boolean>;
  createBranch: (name: string) => Promise<boolean>;
  addRemoteAndPush: (url: string) => Promise<boolean>;
  setUpstream: (remote: string) => Promise<boolean>;
  stashSave: (message: string) => Promise<boolean>;
  stashRestore: (index: number) => Promise<boolean>;
  stashDrop: (index: number) => Promise<boolean>;
  discardFile: (file: ChangedFile) => Promise<boolean>;
  revertCommit: (hash: string) => Promise<boolean>;
  selectFile: (path: string, staged: boolean) => void;
  dismissError: () => void;
  dismissNotARepo: () => void;
}

const RepoContext = createContext<RepoContextValue | null>(null);

function combineChangedFiles(status: StatusResult | null): ChangedFile[] {
  if (!status) return [];
  const byPath = new Map<string, ChangedFile>();
  for (const f of [...status.untracked, ...status.staged, ...status.unstaged]) {
    byPath.set(f.path, { path: f.path, status: f.status, orig_path: f.orig_path });
  }
  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

export function RepoProvider({ children }: { children: ReactNode }) {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [uncheckedPaths, setUncheckedPaths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [commandLog, setCommandLog] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notARepoPath, setNotARepoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const loadSeq = useRef(0);

  const changedFiles = useMemo(() => combineChangedFiles(status), [status]);

  useEffect(() => {
    setUncheckedPaths((prev) => {
      if (prev.size === 0) return prev;
      const present = new Set(changedFiles.map((f) => f.path));
      const next = new Set([...prev].filter((path) => present.has(path)));
      return next.size === prev.size ? prev : next;
    });
  }, [changedFiles]);

  const logCommand = useCallback((command: string, error?: string) => {
    setCommandLog((log) => [{ command, error }, ...log].slice(0, 200));
  }, []);

  const record = useCallback(
    (result: GitActionResult) => logCommand(result.command_run, result.stderr ?? undefined),
    [logCommand],
  );

  const handleError = useCallback(
    (err: unknown) => {
      if (git.isGitError(err)) {
        logCommand(err.command_run, err.message);
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    },
    [logCommand],
  );

  const load = useCallback(
    async (path: string, silent: boolean) => {
      const seq = ++loadSeq.current;
      try {
        const [statusResult, branchList, remoteList] = await Promise.all([
          git.gitStatus(path),
          git.gitBranches(path),
          git.gitRemotes(path),
        ]);
        if (seq !== loadSeq.current) return;
        const files = combineChangedFiles(statusResult.status);
        setRepoPath(path);
        setStatus(statusResult.status);
        setBranches(branchList);
        setRemotes(remoteList);
        setSelectedFile((prev) => (prev && files.some((f) => f.path === prev.path) ? prev : null));
        setRefreshCount((n) => n + 1);
        if (!silent) logCommand(statusResult.command_run);
      } catch (err) {
        if (seq === loadSeq.current) handleError(err);
      }
    },
    [logCommand, handleError],
  );

  useEffect(() => {
    if (!repoPath || busy) return;
    const path = repoPath;
    const onFocus = () => load(path, true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [repoPath, busy, load]);

  async function refresh() {
    if (repoPath) await load(repoPath, false);
  }

  async function openPath(path: string) {
    const root = await git.openRepo(path);
    setNotARepoPath(null);
    setSelectedFile(null);
    setUncheckedPaths(new Set());
    await load(root, false);
  }

  async function pickAndOpenRepo() {
    setBusy(true);
    let picked: string | null = null;
    try {
      picked = await git.pickRepoFolder();
      if (picked) await openPath(picked);
    } catch (err) {
      if (picked && git.isNotARepoError(err)) {
        logCommand(err.command_run, err.message);
        setNotARepoPath(picked);
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  async function initRepo() {
    if (!notARepoPath) return;
    setBusy(true);
    try {
      record(await git.gitInit(notARepoPath));
      await openPath(notARepoPath);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function toggleChecked(path: string) {
    setUncheckedPaths((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  async function mutate(action: (path: string) => Promise<void>): Promise<boolean> {
    if (!repoPath) return false;
    const path = repoPath;
    setBusy(true);
    try {
      await action(path);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      await load(path, false);
      setBusy(false);
    }
  }

  function runOne(action: (path: string) => Promise<GitActionResult>) {
    return mutate(async (path) => record(await action(path)));
  }

  function save(message: string) {
    if (!status) return Promise.resolve(false);
    const included = (f: git.FileEntry) => !uncheckedPaths.has(f.path);
    if (!changedFiles.some(included)) return Promise.resolve(false);
    const toUnstage = status.staged
      .filter((f) => !included(f))
      .flatMap((f) => (f.orig_path ? [f.path, f.orig_path] : [f.path]));
    const toStage = [
      ...status.unstaged,
      ...status.untracked,
      ...status.staged.filter((f) => f.status === "unmerged"),
    ]
      .filter(included)
      .map((f) => f.path);

    return mutate(async (path) => {
      if (toUnstage.length > 0) record(await git.gitUnstage(path, toUnstage));
      if (toStage.length > 0) record(await git.gitStage(path, toStage));
      record(await git.gitCommit(path, message));
    });
  }

  function discardFile(file: ChangedFile) {
    return mutate(async (path) => {
      if (file.orig_path) record(await git.gitDiscard(path, file.orig_path));
      record(await git.gitDiscard(path, file.path));
    });
  }

  function addRemoteAndPush(url: string) {
    const branch = status?.branch;
    if (!branch) return Promise.resolve(false);
    return mutate(async (path) => {
      record(await git.gitAddRemote(path, "origin", url));
      record(await git.gitPushUpstream(path, "origin", branch));
    });
  }

  function setUpstream(remote: string) {
    const branch = status?.branch;
    if (!branch) return Promise.resolve(false);
    return runOne((path) => git.gitPushUpstream(path, remote, branch));
  }

  const value: RepoContextValue = {
    repoPath,
    status,
    branches,
    remotes,
    changedFiles,
    refreshCount,
    uncheckedPaths,
    selectedFile,
    commandLog,
    errorMessage,
    notARepoPath,
    busy,
    pickAndOpenRepo,
    refresh,
    initRepo,
    toggleChecked,
    save,
    push: () => runOne(git.gitPush),
    pull: () => runOne(git.gitPull),
    checkoutBranch: (name) => runOne((path) => git.gitCheckoutBranch(path, name)),
    createBranch: (name) => runOne((path) => git.gitCreateBranch(path, name)),
    addRemoteAndPush,
    setUpstream,
    stashSave: (message) => runOne((path) => git.gitStashSave(path, message)),
    stashRestore: (index) => runOne((path) => git.gitStashRestore(path, index)),
    stashDrop: (index) => runOne((path) => git.gitStashDrop(path, index)),
    discardFile,
    revertCommit: (hash) => runOne((path) => git.gitRevert(path, hash)),
    selectFile: (path, staged) => setSelectedFile({ path, staged }),
    dismissError: () => setErrorMessage(null),
    dismissNotARepo: () => setNotARepoPath(null),
  };

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return ctx;
}

export function useRepoQuery<T>(
  query: ((repo: string) => Promise<T>) | null,
  key = "",
): { data: T | null; error: string | null } {
  const { repoPath, refreshCount } = useRepo();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = query !== null;

  useEffect(() => {
    if (!repoPath || !query) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    query(repoPath).then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      },
      (err) => {
        if (cancelled) return;
        setData(null);
        setError(git.isGitError(err) ? err.message : String(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repoPath, refreshCount, active, key]);

  return { data, error };
}
