import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { loadMapIndex, findMapLinks, openMap } from "../utils/mapLinks";
import styles from "./MessageBubble.module.css";

// Typewriter speed: 5 chars every 16 ms ≈ ~300 chars/sec, smooth at 60 fps.
const CHARS_PER_FRAME = 5;
const FRAME_MS = 16;

// Collapsed "Sources" line under a bot answer; click the arrow to see where it came from.
function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className={styles.sources}>
      <button
        type="button"
        className={styles.sourcesToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{sources.length === 1 ? "1 source" : `${sources.length} sources`}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">›</span>
      </button>
      {open && (
        <ol className={styles.sourcesList}>
          {sources.map((s, i) => (
            <li key={s.id || i} className={styles.sourceItem}>
              <div className={styles.sourceTitle} dir="auto">
                {s.title}
                {s.section && <span className={styles.sourceSection}> · {s.section}</span>}
              </div>
              {s.excerpt && <div className={styles.sourceExcerpt} dir="auto">{s.excerpt}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// "Show on map" buttons for the buildings / A9 rooms an answer mentions.
function MapLinks({ text }) {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    let alive = true;
    if (!/\bA(\d|-P)/.test(text || "")) return;
    loadMapIndex().then((index) => { if (alive) setLinks(findMapLinks(text, index)); });
    return () => { alive = false; };
  }, [text]);
  if (links.length === 0) return null;
  return (
    <div className={styles.mapLinks}>
      {links.map((l) => (
        <button key={l.label} type="button" className={styles.mapLink} title={l.title} onClick={() => openMap(l.hash)}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
          </svg>
          Show {l.label} on map
        </button>
      ))}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const shouldAnimate = !isUser && !!message.animate;

  const [displayed, setDisplayed] = useState(shouldAnimate ? "" : message.content);
  const [isTyping, setIsTyping] = useState(shouldAnimate);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!shouldAnimate) return;
    const full = message.content;
    let i = 0;

    intervalRef.current = setInterval(() => {
      i = Math.min(i + CHARS_PER_FRAME, full.length);
      setDisplayed(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, FRAME_MS);

    return () => clearInterval(intervalRef.current);
  // Intentionally empty deps: the animation runs once when the bubble mounts.
  // Adding `message.content` would restart the animation on every re-render.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}>
      {/* Content */}
      <div className={styles.content}>
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
          {isUser ? (
            <span className={styles.text}>{displayed}</span>
          ) : (
            <div className={`${styles.text} ${styles.markdown}`} dir="auto">
              <ReactMarkdown>{displayed}</ReactMarkdown>
              {isTyping && <span className={styles.cursor} aria-hidden="true" />}
            </div>
          )}
        </div>
        {!isUser && !isTyping && <MapLinks text={message.content} />}
        {!isUser && !isTyping && <Sources sources={message.sources} />}
      </div>
    </div>
  );
}