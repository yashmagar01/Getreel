import re

with open("app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We want to replace everything inside: <div className="max-w-5xl mx-auto px-6 py-12 space-y-10"> ... </div>
# Which is between line 157 and line 240 (roughly the closing tags before Footer)

new_layout = """            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
                
                {/* ── LEFT COLUMN (Main Content) ── */}
                <div className="space-y-12 min-w-0">
                  
                  {/* Topic */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                      <p className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Topic</p>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold leading-[1.15] text-balance text-[var(--text-primary)]">
                      {result.concept?.topic || "What this reel is actually teaching"}
                    </h2>
                    {result.concept?.target_audience && (
                      <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] mt-2">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border border-[var(--border-default)] px-2 py-0.5 rounded-[var(--radius-pill)] bg-white">Audience</span>
                        <span>{result.concept.target_audience}</span>
                      </div>
                    )}
                  </section>

                  {/* Promised Link */}
                  <section>
                    {result.promised_link ? (
                      <PromisedLinkCTA link={result.promised_link} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm text-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                          <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[var(--text-primary)]">No link found</p>
                          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">No specific link was mentioned in this reel.</p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Roadmap */}
                  {result.roadmap && (
                    <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Roadmap</h3>
                        <div className="h-px flex-1 bg-[var(--border-default)]" />
                      </div>
                      <RoadmapDisplay
                        roadmap={result.roadmap}
                        fromCache={result.from_cache || false}
                        skipFirst={true}
                      />
                    </section>
                  )}
                </div>

                {/* ── RIGHT COLUMN (Sidebar) ── */}
                <div className="space-y-6 lg:sticky lg:top-24 mt-8 lg:mt-0">
                  {downloadToken && (
                    <div className="fade-up" style={{ animationDelay: "100ms" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Download</p>
                      </div>
                      <DownloadButton token={downloadToken} />
                    </div>
                  )}

                  {result.roadmap && (
                    <div className="fade-up" style={{ animationDelay: "200ms" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Share</p>
                      </div>
                      <CapsuleShare result={result} capsuleId={result.capsule_id} />
                    </div>
                  )}
                </div>
                
              </div>
            </div>"""

start_str = '            <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">'
end_str = '          </div>\n        )}\n\n        {/* ── Footer'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_layout + "\n          </div>\n        )}\n\n        {/* ── Footer" + content[end_idx + len(end_str):]
    with open("app/page.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Patched app/page.tsx")
else:
    print("Could not find patch markers")
