"use client";

interface PromisedLink {
  url: string;
  description: string;
  source: "comments" | "web_search";
}

interface Props {
  link: PromisedLink;
}

export default function PromisedLinkCTA({ link }: Props) {
  const isFromComments = link.source === "comments";

  return (
    <>
      <style>{`
        .cta-wrapper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto 24px;
        }

        .cta-card {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 24px 28px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.12) 0%,
            rgba(139, 92, 246, 0.08) 100%
          );
        }

        /* subtle animated border glow */
        .cta-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: destination-out;
          mask-composite: exclude;
          opacity: 0.5;
          pointer-events: none;
        }

        .cta-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .cta-badge-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 20px;
          width: fit-content;
        }

        .cta-badge.from-comments {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        .cta-badge.from-web {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
        }

        .cta-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .cta-heading {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .cta-description {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.65;
          margin: 8px 0 0;
        }

        .cta-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px 20px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: -0.01em;
        }

        .cta-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .cta-button:active {
          transform: translateY(0);
        }

        .cta-button-icon {
          font-size: 16px;
        }

        .cta-url-preview {
          margin-top: 10px;
          font-size: 11px;
          color: #475569;
          text-align: center;
          word-break: break-all;
          font-family: monospace;
        }
      `}</style>

      <div className="cta-wrapper">
        <div className="cta-card">
          <div className="cta-top">
            <div className="cta-badge-wrap">
              <span className={`cta-badge ${isFromComments ? "from-comments" : "from-web"}`}>
                <span className="cta-badge-dot" />
                {isFromComments ? "Found in creator's comments" : "Best match found online"}
              </span>
              <h3 className="cta-heading">
                {isFromComments
                  ? "The link the creator promised — found it."
                  : "The resource this reel is based on"}
              </h3>
              {link.description && (
                <p className="cta-description">{link.description}</p>
              )}
            </div>
          </div>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button"
          >
            <span className="cta-button-icon">🔗</span>
            {isFromComments ? "Open the promised link" : "Open the resource"}
            <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>↗</span>
          </a>

          <p className="cta-url-preview">{link.url}</p>
        </div>
      </div>
    </>
  );
}
