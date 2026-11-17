/* Garbo's Guide: owner's in-page editor.
   Turned on by opening any page with ?edit (e.g. https://www.garbosguide.lol/?edit#sister/dune); "Exit edit mode"
   turns it off. It only loads in that browser. Edits are kept as drafts in this browser (localStorage) until you
   press Submit, which opens a pull request on GitHub that changes data/plans.js. Nothing goes live until that PR
   is merged. Submitting needs a fine-grained GitHub token for this repo, saved only in this browser. */
(function () {
  const OWNER = "abeytaadam", REPO = "PinPlan", FILE = "data/plans.js", BASE = "main";
  const K_DRAFTS = "pp-edit-drafts", K_ORIG = "pp-edit-orig", K_TOKEN = "pp-gh-token", K_FLAG = "pp-edit";
  const FIELDS = {
    garbo:   { label: "Garbo says", list: false, hint: "One line, in Garbo’s voice. Garbo talks about himself in the third person." },
    skill:   { label: "Skill shot", list: true,  hint: "One tip per line." },
    rules:   { label: "Rules in brief", list: false, hint: "A short paragraph." },
    plan:    { label: "Game plan", list: true,  hint: "One step per line, most important first." },
    avoid:   { label: "Avoid", list: true,  hint: "One item per line." },
    tourney: { label: "In a tournament", list: true,  hint: "One note per line. Leave empty to show only the formats link." }
  };
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const all = () => window.PLANS.machines.concat(window.PLANS.more);
  const byId = id => all().find(p => p.id === id);
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Drafts: { id: { field: value } }, plus the original values so the PR can show before/after.
  let drafts = ls.get(K_DRAFTS, {}), orig = ls.get(K_ORIG, {});
  for (const [id, f] of Object.entries(drafts)) { const p = byId(id); if (p) for (const [k, v] of Object.entries(f)) { if (v === null) delete p[k]; else p[k] = v; } }
  const count = () => Object.values(drafts).reduce((n, f) => n + Object.keys(f).length, 0);
  const save = () => { ls.set(K_DRAFTS, drafts); ls.set(K_ORIG, orig); bar(); };

  function setField(p, field, value) {
    orig[p.id] = orig[p.id] || {};
    if (!(field in orig[p.id])) orig[p.id][field] = p[field] === undefined ? null : JSON.parse(JSON.stringify(p[field]));
    if (same(value, orig[p.id][field])) {           // back to the original: drop the draft
      if (orig[p.id][field] === null) delete p[field]; else p[field] = orig[p.id][field];
      if (drafts[p.id]) { delete drafts[p.id][field]; if (!Object.keys(drafts[p.id]).length) delete drafts[p.id]; }
      delete orig[p.id][field]; if (!Object.keys(orig[p.id]).length) delete orig[p.id];
    } else {
      if (value === undefined) delete p[field]; else p[field] = value;
      (drafts[p.id] = drafts[p.id] || {})[field] = value === undefined ? null : value;   // null = remove the field
    }
    save();
  }

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .ed-btn { font: 11px/1 var(--f-mono, monospace); letter-spacing: .1em; text-transform: uppercase; color: var(--lime); background: none; border: 1px solid color-mix(in srgb, var(--lime) 55%, transparent); padding: 6px 9px; cursor: pointer; }
  .ed-btn:hover { background: color-mix(in srgb, var(--lime) 12%, transparent); }
  .ed-btn.solid { background: var(--lime); color: #111; border-color: var(--lime); }
  .ed-btn.quiet { color: var(--fg-dim); border-color: var(--line-2); }
  .sec-h .ed-btn { margin-left: auto; }
  .ed-changed { outline: 2px dashed color-mix(in srgb, var(--lime) 70%, transparent); outline-offset: 3px; }
  .says .ed-btn { position: absolute; right: 8px; top: -14px; z-index: 3; background: var(--bg); }
  .says { position: relative; }
  .ed-box { padding: 14px; display: grid; gap: 10px; }
  .ed-box label { font: 11px var(--f-mono, monospace); letter-spacing: .1em; text-transform: uppercase; color: var(--fg-dim); }
  .ed-box textarea { width: 100%; min-height: 120px; resize: vertical; background: #121316; color: var(--fg-hi); border: 1px solid var(--line-2); padding: 10px; font: 15px/1.5 "IBM Plex Sans", system-ui, sans-serif; }
  .ed-box textarea:focus { outline: 1px solid var(--lime); }
  .ed-hint { font-size: 13px; color: var(--fg-dim); }
  .ed-warn { font-size: 13px; color: var(--lime); }
  .ed-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .ed-adds { display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 18px; }
  #ed-bar { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 50; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    background: #0f1013; border: 1px solid var(--lime); box-shadow: 0 10px 30px rgba(0,0,0,.6); padding: 10px 12px; font: 12px var(--f-mono, monospace); letter-spacing: .06em; color: var(--fg-hi); }
  #ed-bar .msg { flex: 1 1 200px; text-transform: uppercase; }
  #ed-bar a { color: var(--lime); }
  body.ed-on { padding-bottom: 90px; }
  #ed-dlg { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.65); display: grid; place-items: center; padding: 16px; }
  #ed-dlg .pane { max-width: 620px; width: 100%; max-height: 85vh; overflow: auto; background: #15161a; border: 1px solid var(--line-2); padding: 20px; color: var(--fg-hi); font: 15px/1.55 "IBM Plex Sans", system-ui, sans-serif; }
  #ed-dlg h3 { font-family: "Instrument Serif", serif; font-weight: 400; font-size: 28px; margin: 0 0 10px; }
  #ed-dlg ol, #ed-dlg ul { padding-left: 20px; } #ed-dlg li { margin: 4px 0; }
  #ed-dlg input { width: 100%; background: #121316; color: var(--fg-hi); border: 1px solid var(--line-2); padding: 9px; font: 14px monospace; }
  #ed-dlg .chg { border-top: 1px solid var(--line); padding: 10px 0; } #ed-dlg .chg b { color: var(--lime); font-weight: 600; }
  #ed-dlg del { color: var(--fg-dim); } #ed-dlg ins { text-decoration: none; }
  `;
  document.head.appendChild(css);

  /* ---------- bottom bar ---------- */
  function bar(text) {
    let b = document.getElementById("ed-bar");
    if (!b) {
      if (!document.body) return;
      b = document.createElement("div"); b.id = "ed-bar"; document.body.appendChild(b); document.body.classList.add("ed-on");
    }
    const n = count(), games = Object.keys(drafts).length;
    b.innerHTML = `<span class="msg">${text || (n ? `✎ Edit mode · ${n} change${n === 1 ? "" : "s"} on ${games} game${games === 1 ? "" : "s"}, not live yet` : "✎ Edit mode · tap ✎ Edit on any section")}</span>
      ${n ? `<button class="ed-btn" data-a="review">Review</button><button class="ed-btn solid" data-a="submit">Submit changes</button>` : ""}
      <button class="ed-btn quiet" data-a="key">${ls.get(K_TOKEN, "") ? "GitHub key ✓" : "Set GitHub key"}</button>
      <button class="ed-btn quiet" data-a="exit">Exit edit mode</button>`;
    b.onclick = e => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "review") review();
      if (a === "submit") submit();
      if (a === "key") keyDialog();
      if (a === "exit") { if (count() && !confirm("Leave edit mode? Your unsubmitted changes stay saved in this browser for next time.")) return; ls.del(K_FLAG); location.href = location.pathname + location.hash; }
    };
  }
  document.addEventListener("DOMContentLoaded", () => bar());

  /* ---------- section editing ---------- */
  function sectionFor(body, label) {
    return [...body.querySelectorAll(".sec")].find(s => s.querySelector(".sec-h span")?.textContent.trim() === label);
  }
  function openEditor(m, field, host, rerender) {
    const f = FIELDS[field];
    const cur = field === "garbo" ? (m.garbo || "") : f.list ? (m[field] || []).join("\n") : (m[field] || "");
    const box = document.createElement("div"); box.className = "ed-box";
    box.innerHTML = `<label>${esc(f.label)} · ${esc(m.name)}</label>
      <textarea>${esc(cur)}</textarea>
      <div class="ed-hint">${esc(f.hint)}${field === "garbo" && !m.garbo ? ` Empty means the researched line shows instead: “${esc(m.thesis)}”` : ""}</div>
      <div class="ed-warn" hidden></div>
      <div class="ed-row"><button class="ed-btn solid" data-x="ok">Save to draft</button><button class="ed-btn quiet" data-x="cancel">Cancel</button>
      ${orig[m.id] && field in orig[m.id] ? `<button class="ed-btn quiet" data-x="undo">Undo my changes here</button>` : ""}</div>`;
    const ta = box.querySelector("textarea"), warn = box.querySelector(".ed-warn");
    const check = () => {
      const firstPerson = field === "garbo" && /\b(I|I'm|I’m|I've|I’ve|I'd|I’d|me|my|My|mine)\b/.test(ta.value);
      warn.hidden = !firstPerson;
      warn.textContent = "Heads up: Garbo speaks in the third person. Try “Garbo likes…” instead of “I like…”.";
    };
    ta.addEventListener("input", check); check();
    ta.style.height = Math.max(120, Math.min(420, ta.scrollHeight + 10)) + "px";
    box.onclick = e => {
      const x = e.target.closest("[data-x]")?.dataset.x; if (!x) return;
      if (x === "ok") {
        const raw = ta.value.replace(/\r/g, "");
        let val = f.list ? raw.split("\n").map(s => s.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean) : raw.replace(/\s+/g, " ").trim();
        if (field === "garbo" && !val) val = undefined;
        if (field === "rules" && !val) val = "";
        setField(m, field, val);
      }
      if (x === "undo") { setField(m, field, orig[m.id][field] === null ? undefined : orig[m.id][field]); }
      rerender();
    };
    host.replaceChildren(box); ta.focus();
  }

  function decorate(m, body) {
    if (m.uncurated) return;
    const rerender = () => { const y = window.scrollY; window.renderDetail(m); window.scrollTo(0, y); };
    const changed = drafts[m.id] || {};
    const btn = (field) => { const b = document.createElement("button"); b.type = "button"; b.className = "ed-btn"; b.textContent = "✎ Edit"; b.dataset.field = field; return b; };
    // Garbo says (the bubble)
    const says = body.querySelector(".says");
    if (says) {
      const b = btn("garbo"); says.appendChild(b);
      if ("garbo" in changed) says.classList.add("ed-changed");
      b.onclick = () => { const host = document.createElement("section"); host.className = "sec"; says.after(host); says.hidden = true; openEditor(m, "garbo", host, rerender); };
    }
    // Skill shot (a <details>: keep it open while editing)
    const sk = body.querySelector(".skill-sec");
    if (sk) {
      const b = btn("skill"); b.style.marginLeft = "auto";
      sk.querySelector("summary").insertBefore(b, sk.querySelector("summary .tog"));
      if ("skill" in changed) sk.classList.add("ed-changed");
      b.onclick = e => { e.preventDefault(); e.stopPropagation(); sk.open = true; openEditor(m, "skill", sk.querySelector(".sec-b"), rerender); };
    }
    for (const [field, label] of [["rules", "Rules in brief"], ["plan", "Game plan"], ["avoid", "Avoid"], ["tourney", "In a tournament"]]) {
      const s = sectionFor(body, label); if (!s) continue;
      const b = btn(field); s.querySelector(".sec-h").appendChild(b);
      if (field in changed) s.classList.add("ed-changed");
      b.onclick = () => openEditor(m, field, s.querySelector(".sec-b"), rerender);
    }
    // Sections that are empty and so not on the page: offer to add them.
    const missing = [["skill", !sk], ["rules", !m.rules], ["avoid", !(m.avoid && m.avoid.length)]].filter(x => x[1]).map(x => x[0]);
    const col = body.querySelector(".d-grid .col");
    if (missing.length && col) {
      const adds = document.createElement("div"); adds.className = "ed-adds";
      missing.forEach(field => {
        const b = document.createElement("button"); b.className = "ed-btn quiet"; b.textContent = "+ Add " + FIELDS[field].label.toLowerCase();
        b.onclick = () => { const holder = document.createElement("section"); holder.className = "sec"; adds.after(holder); openEditor(m, field, holder, rerender); };
        adds.appendChild(b);
      });
      col.prepend(adds);
    }
  }

  /* ---------- dialogs ---------- */
  function dialog(html) {
    let d = document.getElementById("ed-dlg"); if (d) d.remove();
    d = document.createElement("div"); d.id = "ed-dlg"; d.innerHTML = `<div class="pane">${html}</div>`;
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.remove(); });
    document.body.appendChild(d); return d;
  }
  const showList = v => Array.isArray(v) ? v.map(x => "• " + esc(x)).join("<br>") : esc(v ?? "(empty)");
  function changesHtml() {
    return Object.entries(drafts).map(([id, f]) => {
      const p = byId(id);
      return Object.entries(f).map(([k, v]) => `<div class="chg"><b>${esc(p ? p.name : id)} · ${esc(FIELDS[k]?.label || k)}</b><br>
        <del>${showList(orig[id]?.[k])}</del><br><ins>${showList(v)}</ins></div>`).join("");
    }).join("");
  }
  function review() {
    const d = dialog(`<h3>Your changes</h3><p class="ed-hint">Crossed out is what’s live now; below it is your version.</p>${changesHtml()}
      <div class="ed-row" style="margin-top:14px"><button class="ed-btn solid" data-a="submit">Submit changes</button><button class="ed-btn quiet" data-a="discard">Discard all</button><button class="ed-btn quiet" data-close>Close</button></div>`);
    d.querySelector("[data-a=submit]").onclick = () => { d.remove(); submit(); };
    d.querySelector("[data-a=discard]").onclick = () => {
      if (!confirm("Discard all your unsubmitted changes?")) return;
      for (const [id, f] of Object.entries(orig)) { const p = byId(id); if (p) for (const [k, v] of Object.entries(f)) { if (v === null) delete p[k]; else p[k] = v; } }
      drafts = {}; orig = {}; save(); d.remove(); window.route && window.route(true);
    };
  }
  function keyDialog(after) {
    const has = !!ls.get(K_TOKEN, "");
    const d = dialog(`<h3>GitHub key</h3>
      <p>To send changes, this browser needs a key that can open pull requests on the PinPlan repo. It’s saved only in this browser.</p>
      <ol>
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → New fine-grained token ↗</a>.</li>
        <li>Name it “Garbo editor”, and pick an expiration (up to a year).</li>
        <li><b>Repository access:</b> Only select repositories → <b>PinPlan</b>.</li>
        <li><b>Permissions → Repository:</b> Contents: <b>Read and write</b>, Pull requests: <b>Read and write</b>.</li>
        <li>Generate the token, copy it, and paste it here.</li>
      </ol>
      <input type="password" placeholder="${has ? "A key is saved. Paste a new one to replace it." : "github_pat_…"}" autocomplete="off">
      <div class="ed-row" style="margin-top:12px"><button class="ed-btn solid" data-a="save">Save key</button>${has ? `<button class="ed-btn quiet" data-a="forget">Remove saved key</button>` : ""}<button class="ed-btn quiet" data-close>Close</button></div>`);
    d.querySelector("[data-a=save]").onclick = () => { const v = d.querySelector("input").value.trim(); if (!v) return; ls.set(K_TOKEN, v); d.remove(); bar(); after && after(); };
    const f = d.querySelector("[data-a=forget]"); if (f) f.onclick = () => { ls.del(K_TOKEN); d.remove(); bar(); };
  }

  /* ---------- submit: branch + commit + pull request ---------- */
  const b64enc = s => { const u = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), c => c.charCodeAt(0)));
  async function gh(path, opts = {}) {
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + path, {
      ...opts, headers: { "Accept": "application/vnd.github+json", "Authorization": "Bearer " + ls.get(K_TOKEN, ""), "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) }
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.message || r.statusText) + " (" + r.status + ")");
    return j;
  }
  async function submit() {
    if (!count()) return;
    if (!ls.get(K_TOKEN, "")) return keyDialog(submit);
    const names = Object.keys(drafts).map(id => byId(id)?.name || id);
    bar("Sending your changes to GitHub…");
    try {
      const ref = await gh("/git/ref/heads/" + BASE);
      const file = await gh("/contents/" + FILE + "?ref=" + BASE);
      const text = b64dec(file.content);
      const at = text.search(/^window\.PLANS = /m); if (at < 0) throw new Error("data/plans.js isn’t in the expected format.");
      const head = text.slice(0, at), data = JSON.parse(text.slice(at + 15).replace(/;\s*$/, ""));
      const plans = data.machines.concat(data.more);
      for (const [id, f] of Object.entries(drafts)) {
        const p = plans.find(x => x.id === id); if (!p) throw new Error("Game " + id + " isn’t in the live file any more.");
        for (const [k, v] of Object.entries(f)) { if (v === undefined || v === null) delete p[k]; else p[k] = v; }
      }
      const out = head + "window.PLANS = " + JSON.stringify(data, null, 2) + ";\n";
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const branch = "edit/" + (Object.keys(drafts).length === 1 ? Object.keys(drafts)[0] : "games") + "-" + stamp;
      await gh("/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + branch, sha: ref.object.sha }) });
      const title = "Edits: " + (names.length <= 3 ? names.join(", ") : names.length + " games");
      await gh("/contents/" + FILE, { method: "PUT", body: JSON.stringify({ message: title, content: b64enc(out), sha: file.sha, branch }) });
      const md = v => v == null ? "_(empty)_" : Array.isArray(v) ? (v.length ? v.map(x => "- " + x).join("\n") : "_(empty)_") : v;
      const bodyMd = "Changes made with the in-page editor.\n\n" + Object.entries(drafts).map(([id, f]) =>
        Object.entries(f).map(([k, v]) => `### ${byId(id)?.name || id} · ${FIELDS[k]?.label || k}\n\n**Before**\n\n${md(orig[id]?.[k])}\n\n**After**\n\n${md(v)}`).join("\n\n")).join("\n\n");
      const pr = await gh("/pulls", { method: "POST", body: JSON.stringify({ title, head: branch, base: BASE, body: bodyMd }) });
      drafts = {}; orig = {}; save();
      bar(`Sent ✓ <a href="${pr.html_url}" target="_blank" rel="noopener">Open pull request #${pr.number} ↗</a> and merge it to make it live`);
    } catch (err) {
      bar("Couldn’t send: " + esc(err.message) + ". Your changes are still saved here.");
      if (/Bad credentials|401|403|Resource not accessible/i.test(err.message)) setTimeout(() => keyDialog(), 400);
    }
  }

  window.PPEdit = { decorate };
})();
