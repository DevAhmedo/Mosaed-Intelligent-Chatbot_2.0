import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MAP_PAGE } from "../utils/mapLinks";
import styles from "./MapViewer.module.css";

// The 3D campus map in a panel over the chat. It opens on "Show on map" buttons and the header
// map button (event "mosaed:open-map"). After the first open it stays loaded but hidden, so the
// 12 MB model is not downloaded again; a new place only changes the page's #hash.
export default function MapViewer() {
  const [hash, setHash] = useState(null); // null = never opened
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = (e) => { setHash(e.detail?.hash || ""); setOpen(true); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mosaed:open-map", onOpen);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mosaed:open-map", onOpen);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  if (hash === null) return null;
  const src = MAP_PAGE + (hash ? "#" + hash : "");

  return createPortal(
    <div className={styles.overlay} hidden={!open} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className={styles.panel} role="dialog" aria-label="Campus map">
        <div className={styles.bar}>
          <span className={styles.title}>Campus map</span>
          <a className={styles.newTab} href={src} target="_blank" rel="noreferrer">Open in new tab ↗</a>
          <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close map">×</button>
        </div>
        <iframe className={styles.frame} src={src} title="University of Sharjah campus map" />
      </div>
    </div>,
    document.body,
  );
}
