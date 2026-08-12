import { useState } from "react";
import { useRepo } from "../state/repo";

export function RemoteStatus() {
  const { status, remotes, addRemoteAndPush, setUpstream, busy } = useRepo();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");

  if (status?.upstream) {
    const remoteName = status.upstream.split("/")[0];
    const remoteUrl = remotes.find((r) => r.name === remoteName)?.url;
    return (
      <span className="remote-status" title={remoteUrl}>
        Pushes to {status.upstream}
      </span>
    );
  }

  if (remotes.length > 0) {
    return (
      <button type="button" onClick={() => setUpstream(remotes[0].name)} disabled={busy}>
        Set upstream
      </button>
    );
  }

  if (adding) {
    return (
      <form
        className="remote-add-form"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = url.trim();
          if (!trimmed) return;
          addRemoteAndPush(trimmed);
          setUrl("");
          setAdding(false);
        }}
      >
        <input
          autoFocus
          placeholder="remote URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => !url && setAdding(false)}
        />
        <button type="submit" disabled={busy}>
          Add
        </button>
      </form>
    );
  }

  return (
    <button type="button" onClick={() => setAdding(true)} disabled={busy}>
      Add remote
    </button>
  );
}
