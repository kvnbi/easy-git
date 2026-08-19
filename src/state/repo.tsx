import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as git from "../api/git";
import type { BranchInfo, OpenRepoResult, RemoteInfo, StatusResult } from "../api/git";

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
  initRepo: () => Promise<void>;
  toggleChecked: (path: string) => void;
  save: (message: string) => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  addRemoteAndPush: (url: string) => Promise<void>;
  setUpstream: (remote: string) => Promise<void>;
  stashSave: (message: string) => Promise<void>;
  stashRestore: (index: number) => Promise<void>;
  stashDrop: (index: number) => Promise<void>;
  discardFile: (file: ChangedFile) => Promise<void>;
  revertCommit: (hash: string) => Promise<void>;
  selectFile: (path: string, staged: boolean) => void;
  dismissError: () => void;
  dismissNotARepo: () => void;
}

const RepoContext = createContext<RepoContextValue | null>(null);

function combineChangedFiles(status: StatusResult | null): ChangedFile[] {
  if (!status) return [];
  const byPath = new Map<string, ChangedFile>();
  for (const f of status.untracked) {
    byPath.set(f.path, { path: f.path, status: f.status, orig_path: null });
  }
  for (const f of status.staged) {
    byPath.set(f.path, { path: f.path, status: f.status, orig_path: f.orig_path });
  }
  for (const f of status.unstaged) {
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

  const changedFiles = useMemo(() => combineChangedFiles(status), [status]);

  useEffect(() => {
    setUncheckedPaths(new Set());
  }, [status]);

  const logCommand = useCallback((command: string, error?: string) => {
    setCommandLog((log) => [{ command, error }, ...log].slice(0, 200));
  }, []);

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

  const loadBranches = useCallback(
    async (path: string) => {
      try {
        setBranches(await git.gitBranches(path));
      } catch (err) {
        handleError(err);
      }
    },
    [handleError],
  );

  const loadRemotes = useCallback(
    async (path: string) => {
      try {
        setRemotes(await git.gitRemotes(path));
      } catch (err) {
        handleError(err);
      }
    },
    [handleError],
  );

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    try {
      const result = await git.gitStatus(repoPath);
      setStatus(result.status);
      logCommand(result.command_run);
      setSelectedFile((prev) => {
        if (!prev) return prev;
        const stillChanged = combineChangedFiles(result.status).some((f) => f.path === prev.path);
        return stillChanged ? prev : null;
      });
      await Promise.all([loadBranches(repoPath), loadRemotes(repoPath)]);
      setRefreshCount((n) => n + 1);
    } catch (err) {
      handleError(err);
    }
  }, [repoPath, logCommand, handleError, loadBranches, loadRemotes]);

  const applyOpenedRepo = useCallback(
    async (result: OpenRepoResult) => {
      setRepoPath(result.path);
      setStatus(result.status);
      setSelectedFile(null);
      setNotARepoPath(null);
      logCommand(result.command_run);
      await Promise.all([loadBranches(result.path), loadRemotes(result.path)]);
      setRefreshCount((n) => n + 1);
    },
    [logCommand, loadBranches, loadRemotes],
  );

  const pickAndOpenRepo = useCallback(async () => {
    setBusy(true);
    let picked: string | null = null;
    try {
      picked = await git.pickRepoFolder();
      if (!picked) return;
      const result = await git.openRepo(picked);
      await applyOpenedRepo(result);
    } catch (err) {
      if (picked && git.isNotARepoError(err)) {
        if (git.isGitError(err)) logCommand(err.command_run, err.message);
        setNotARepoPath(picked);
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  }, [applyOpenedRepo, logCommand, handleError]);

  const initRepo = useCallback(async () => {
    if (!notARepoPath) return;
    const path = notARepoPath;
    setBusy(true);
    try {
      const initResult = await git.gitInit(path);
      logCommand(initResult.command_run, initResult.stderr ?? undefined);
      const result = await git.openRepo(path);
      await applyOpenedRepo(result);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }, [notARepoPath, applyOpenedRepo, logCommand, handleError]);

  const toggleChecked = useCallback((path: string) => {
    setUncheckedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const runMutation = useCallback(
    async (action: (path: string) => Promise<git.GitActionResult>) => {
      if (!repoPath) return;
      setBusy(true);
      try {
        const result = await action(repoPath);
        logCommand(result.command_run, result.stderr ?? undefined);
        await refreshStatus();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
    },
    [repoPath, logCommand, handleError, refreshStatus],
  );

  const push = useCallback(() => runMutation(git.gitPush), [runMutation]);
  const pull = useCallback(() => runMutation(git.gitPull), [runMutation]);

  const checkoutBranch = useCallback(
    (name: string) => runMutation((path) => git.gitCheckoutBranch(path, name)),
    [runMutation],
  );

  const createBranch = useCallback(
    (name: string) => runMutation((path) => git.gitCreateBranch(path, name)),
    [runMutation],
  );

  const addRemoteAndPush = useCallback(
    async (url: string) => {
      if (!repoPath || !status?.branch) return;
      const branch = status.branch;
      setBusy(true);
      try {
        const addResult = await git.gitAddRemote(repoPath, "origin", url);
        logCommand(addResult.command_run, addResult.stderr ?? undefined);
        const pushResult = await git.gitPushUpstream(repoPath, "origin", branch);
        logCommand(pushResult.command_run, pushResult.stderr ?? undefined);
        await refreshStatus();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
    },
    [repoPath, status, logCommand, handleError, refreshStatus],
  );

  const setUpstream = useCallback(
    (remote: string) => {
      const branch = status?.branch ?? "";
      return runMutation((path) => git.gitPushUpstream(path, remote, branch));
    },
    [status, runMutation],
  );

  const stashSave = useCallback(
    (message: string) => runMutation((path) => git.gitStashSave(path, message)),
    [runMutation],
  );

  const stashRestore = useCallback(
    (index: number) => runMutation((path) => git.gitStashRestore(path, index)),
    [runMutation],
  );

  const stashDrop = useCallback(
    (index: number) => runMutation((path) => git.gitStashDrop(path, index)),
    [runMutation],
  );

  const revertCommit = useCallback(
    (hash: string) => runMutation((path) => git.gitRevert(path, hash)),
    [runMutation],
  );

  const save = useCallback(
    async (message: string) => {
      if (!repoPath || !status) return;
      const toStage = changedFiles
        .filter((f) => !uncheckedPaths.has(f.path))
        .map((f) => f.path);
      const toUnstage = status.staged
        .filter((f) => uncheckedPaths.has(f.path))
        .map((f) => f.path);

      if (toStage.length === 0) return;

      setBusy(true);
      try {
        if (toUnstage.length > 0) {
          const result = await git.gitUnstage(repoPath, toUnstage);
          logCommand(result.command_run, result.stderr ?? undefined);
        }
        const stageResult = await git.gitStage(repoPath, toStage);
        logCommand(stageResult.command_run, stageResult.stderr ?? undefined);
        const commitResult = await git.gitCommit(repoPath, message);
        logCommand(commitResult.command_run, commitResult.stderr ?? undefined);
        await refreshStatus();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
    },
    [repoPath, status, changedFiles, uncheckedPaths, logCommand, handleError, refreshStatus],
  );

  const discardFile = useCallback(
    async (file: ChangedFile) => {
      if (!repoPath) return;
      setBusy(true);
      try {
        if (file.orig_path) {
          const origResult = await git.gitDiscard(repoPath, file.orig_path);
          logCommand(origResult.command_run, origResult.stderr ?? undefined);
        }
        const result = await git.gitDiscard(repoPath, file.path);
        logCommand(result.command_run, result.stderr ?? undefined);
        await refreshStatus();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
    },
    [repoPath, logCommand, handleError, refreshStatus],
  );

  const selectFile = useCallback((path: string, staged: boolean) => {
    setSelectedFile({ path, staged });
  }, []);

  const dismissError = useCallback(() => setErrorMessage(null), []);
  const dismissNotARepo = useCallback(() => setNotARepoPath(null), []);

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
    initRepo,
    toggleChecked,
    save,
    push,
    pull,
    checkoutBranch,
    createBranch,
    addRemoteAndPush,
    setUpstream,
    stashSave,
    stashRestore,
    stashDrop,
    discardFile,
    revertCommit,
    selectFile,
    dismissError,
    dismissNotARepo,
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
