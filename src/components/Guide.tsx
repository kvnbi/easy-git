import { useEffect } from "react";

interface GuideProps {
  open: boolean;
  onClose: () => void;
}

interface GuideStep {
  title: string;
  text: string;
}

const steps: GuideStep[] = [
  {
    title: "Open a project",
    text: "Choose a folder on your computer. If it is not a Git project yet, easy-git offers to start one for you.",
  },
  {
    title: "Check what to save",
    text: "Every changed file appears in one list, already checked. Uncheck anything you want to leave out.",
  },
  {
    title: "Write a short note",
    text: "A few words about what changed, in the box at the bottom.",
  },
  {
    title: "Save your work",
    text: "Click Save. Git calls this a commit.",
  },
  {
    title: "Share your work",
    text: "Click Push to send your saved changes online.",
  },
];

const glossary = [
  { term: "Save", meaning: "Called a commit in Git. Saves your checked changes with a note." },
  { term: "Push", meaning: "Send your saved changes online." },
  { term: "Pull", meaning: "Get the newest changes from online." },
  { term: "Branch", meaning: "A separate copy of your project for trying new ideas safely." },
];

export function Guide({ open, onClose }: GuideProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="How to use easy-git"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>How easy-git works</h2>
        <p className="modal-intro">Five steps. No commands to remember.</p>

        <ol className="guide-steps">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className="guide-step-number">{i + 1}</span>
              <div className="guide-step-text">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="modal-section">
          <h3>Quick words</h3>
          <dl>
            {glossary.map((item) => (
              <div className="modal-list-item" key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>

        <button type="button" className="modal-close" onClick={onClose}>
          Got It
        </button>
      </div>
    </div>
  );
}
