class D extends Error {
  constructor(c) {
    super(c), this.name = "WikiError", Object.setPrototypeOf(this, new.target.prototype);
  }
}
class v extends D {
  constructor(c, h) {
    super(c), this.field = h, this.name = "ValidationError";
  }
}
class M extends D {
  constructor(c) {
    super(c), this.name = "StorageError";
  }
}
const _ = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
function I(l, c = _) {
  var T;
  const h = N(l), a = [], d = /* @__PURE__ */ new Set();
  c.lastIndex = 0;
  const m = new RegExp(c.source, "g");
  let p;
  for (; (p = m.exec(h)) !== null; ) {
    let u = (T = p[1]) == null ? void 0 : T.trim();
    u != null && u.includes(`
`) || (u && (u = u.replace(/^\[+/, "")), u && u.length > 0 && !d.has(u) && (a.push(u), d.add(u)));
  }
  return a;
}
function N(l) {
  let c = l;
  return c = c.replace(/```[\s\S]*?```/g, ""), c = c.replace(/~~~[\s\S]*?~~~/g, ""), c = c.replace(/``[^`]*?``/g, ""), c = c.replace(/`[^`\n]*?`/g, ""), c = c.replace(/^ {4}.*/gm, ""), c;
}
function B() {
  const l = /* @__PURE__ */ new Map();
  return {
    save(c) {
      return l.set(c.id, { ...c }), Promise.resolve();
    },
    load(c) {
      const h = l.get(c);
      return Promise.resolve(h ? { ...h } : null);
    },
    delete(c) {
      return l.delete(c), Promise.resolve();
    },
    list() {
      const c = Array.from(l.values()).map((h) => ({ ...h }));
      return Promise.resolve(c);
    }
  };
}
const O = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, R = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]), S = 1e3, A = 1e7, $ = 100, C = 100;
function z(l) {
  const c = {};
  for (const h of Object.keys(l))
    R.has(h) || Object.hasOwn(l, h) && (c[h] = l[h]);
  return c;
}
function G(l) {
  if (l != null && l.storage) {
    const e = l.storage;
    if (typeof e.save != "function" || typeof e.load != "function" || typeof e.delete != "function" || typeof e.list != "function")
      throw new TypeError("Storage must implement WikiStorage interface");
  }
  if (l != null && l.linkPattern) {
    if (!(l.linkPattern instanceof RegExp))
      throw new TypeError("linkPattern must be a RegExp");
    if (!/\([^?]/.test(l.linkPattern.source))
      throw new Error("linkPattern must have at least one capture group");
  }
  const c = (l == null ? void 0 : l.storage) ?? B(), h = (l == null ? void 0 : l.linkPattern) ?? O, a = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Set();
  let T = 1;
  function u(e) {
    const t = e.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (t) return t;
    const r = `page-${String(T)}`;
    return T++, r;
  }
  function b(e) {
    if (!a.has(e))
      return e;
    let t = 2;
    for (; a.has(`${e}-${String(t)}`); )
      t++;
    return `${e}-${String(t)}`;
  }
  function x(e, t = !1) {
    if ("title" in e) {
      const r = e.title;
      if (r === void 0) {
        if (!t)
          throw new v("Title is required");
      } else {
        if (typeof r != "string")
          throw new v("Title is required");
        if (r.trim() === "")
          throw new v("Title cannot be empty");
        if (r.length > S)
          throw new v(`Title exceeds maximum length of ${S}`);
      }
    } else if (!t)
      throw new v("Title is required");
    if ("content" in e && e.content !== void 0) {
      const r = e.content;
      if (typeof r == "string" && r.length > A)
        throw new v(`Content exceeds maximum length of ${A}`);
    }
    if ("tags" in e && e.tags !== void 0) {
      if (!Array.isArray(e.tags))
        throw new TypeError("Tags must be an array");
      if (e.tags.length > C)
        throw new v(`Tags array exceeds maximum count of ${C}`);
      for (const r of e.tags) {
        if (typeof r != "string" || r.trim() === "")
          throw new TypeError("Each tag must be a non-empty string");
        if (r.length > $)
          throw new v(`Tag exceeds maximum length of ${$}`);
      }
    }
    if ("type" in e && e.type !== void 0 && typeof e.type != "string")
      throw new TypeError("Type must be a string");
  }
  function P(e, t) {
    const r = I(t, h), s = new Set(r);
    d.set(e, s);
    for (const o of r) {
      const i = u(o);
      m.has(i) || m.set(i, /* @__PURE__ */ new Set());
      const n = m.get(i);
      n && n.add(e);
    }
  }
  function L(e) {
    var r, s;
    const t = d.get(e) ?? /* @__PURE__ */ new Set();
    for (const o of t) {
      const i = u(o);
      (r = m.get(i)) == null || r.delete(e), ((s = m.get(i)) == null ? void 0 : s.size) === 0 && m.delete(i);
    }
    d.delete(e), m.delete(e);
  }
  function E(e) {
    for (const t of p)
      try {
        t(e);
      } catch (r) {
        console.error("Subscriber error:", r);
      }
  }
  const k = {
    async createPage(e) {
      x(e);
      const t = e.title, r = e.content ?? "";
      let s;
      if (e.id) {
        if (a.has(e.id))
          throw new Error(`Page with id '${e.id}' already exists`);
        s = e.id;
      } else {
        const n = u(t);
        s = b(n);
      }
      const o = /* @__PURE__ */ new Date(), i = {
        id: s,
        title: t,
        content: r,
        ...e.type !== void 0 && { type: e.type },
        ...e.tags !== void 0 && { tags: e.tags },
        created: o,
        modified: o
      };
      return a.set(s, i), P(s, r), await c.save(i), E({ type: "create", page: i }), { ...i };
    },
    getPage(e) {
      if (!e || typeof e != "string")
        return;
      const t = a.get(e);
      return t ? { ...t } : void 0;
    },
    getPageByTitle(e, t) {
      if (!(!e || typeof e != "string")) {
        if (t != null && t.ignoreCase) {
          const r = e.toLowerCase();
          for (const s of a.values())
            if (s.title.toLowerCase() === r)
              return { ...s };
          return;
        }
        for (const r of a.values())
          if (r.title === e)
            return { ...r };
      }
    },
    async updatePage(e, t) {
      const r = a.get(e);
      if (!r)
        throw new Error(`Page '${e}' not found`);
      x(t, !0);
      const s = { ...r }, o = t.content !== void 0 && t.content !== r.content;
      return t.title !== void 0 && (r.title = t.title), t.content !== void 0 && (r.content = t.content), "type" in t && (t.type === void 0 ? delete r.type : r.type = t.type), "tags" in t && (t.tags === void 0 ? delete r.tags : r.tags = t.tags), r.modified = /* @__PURE__ */ new Date(), o && (L(e), P(e, r.content)), a.set(e, r), await c.save(r), E({ type: "update", page: { ...r }, previous: s }), { ...r };
    },
    async deletePage(e, t) {
      const r = a.get(e);
      if (!r)
        throw new Error(`Page '${e}' not found`);
      const s = { ...r };
      a.delete(e), (t == null ? void 0 : t.updateLinks) !== !1 && L(e), await c.delete(e), E({ type: "delete", page: s });
    },
    async renamePage(e, t, r) {
      if (!t || t.trim() === "")
        throw new Error("Title cannot be empty");
      const s = a.get(e);
      if (!s)
        throw new Error(`Page '${e}' not found`);
      const o = s.title;
      if (s.title = t, s.modified = /* @__PURE__ */ new Date(), r != null && r.updateId) {
        const i = u(t);
        if (i !== e) {
          if (a.has(i))
            throw new Error(`Page with id '${i}' already exists`);
          for (const [g, y] of d.entries()) {
            const w = a.get(g);
            w && y.has(o) && (w.content = w.content.replace(
              new RegExp(`\\[\\[${F(o)}(\\|[^\\]]+)?\\]\\]`, "g"),
              `[[${t}$1]]`
            ), await c.save(w));
          }
          a.delete(e), s.id = i, a.set(i, s);
          const n = d.get(e);
          n && (d.delete(e), d.set(i, n));
          const f = m.get(e);
          f && (m.delete(e), m.set(i, f));
          for (const g of d.values()) {
            const y = Array.from(g);
            for (const w of y)
              u(w) === e && (g.delete(w), g.add(t));
          }
          for (const g of m.values())
            g.has(e) && (g.delete(e), g.add(i));
        }
      }
      return await c.save(s), E({ type: "rename", page: { ...s }, previousTitle: o }), { ...s };
    },
    getLinks(e) {
      const t = d.get(e);
      return t ? Array.from(t) : [];
    },
    getBacklinks(e) {
      const t = m.get(e);
      return t ? Array.from(t) : [];
    },
    getLinkedPages(e) {
      const t = k.getLinks(e), r = [];
      for (const s of t) {
        const o = u(s), i = a.get(o);
        i !== void 0 && r.push({ ...i });
      }
      return r;
    },
    getBacklinkPages(e) {
      return k.getBacklinks(e).map((r) => a.get(r)).filter((r) => r !== void 0).map((r) => ({ ...r }));
    },
    resolveLink(e) {
      return u(e);
    },
    resolveLinkToPage(e) {
      const t = k.resolveLink(e);
      return k.getPage(t);
    },
    getDeadLinks() {
      const e = [];
      for (const [t, r] of d.entries())
        for (const s of r) {
          const o = u(s);
          a.has(o) || e.push({ source: t, target: s });
        }
      return e;
    },
    getDeadLinksForPage(e) {
      const t = d.get(e);
      if (!t) return [];
      const r = [];
      for (const s of t) {
        const o = u(s);
        a.has(o) || r.push(s);
      }
      return r;
    },
    getOrphans() {
      const e = [];
      for (const t of a.values()) {
        const r = m.get(t.id);
        (!r || r.size === 0) && e.push({ ...t });
      }
      return e;
    },
    getGraph() {
      const e = {};
      for (const t of a.values()) {
        const r = d.get(t.id) ?? /* @__PURE__ */ new Set();
        e[t.id] = Array.from(r).map((s) => u(s));
      }
      return e;
    },
    getConnectedPages(e, t = 1) {
      if (!a.get(e)) return [];
      const s = /* @__PURE__ */ new Set(), o = [{ id: e, currentDepth: 0 }], i = /* @__PURE__ */ new Set();
      for (; o.length > 0; ) {
        const n = o.shift();
        if (!(!n || s.has(n.id)) && (s.add(n.id), i.add(n.id), n.currentDepth < t)) {
          const f = k.getLinks(n.id);
          for (const y of f) {
            const w = u(y);
            !s.has(w) && a.has(w) && o.push({ id: w, currentDepth: n.currentDepth + 1 });
          }
          const g = k.getBacklinks(n.id);
          for (const y of g)
            s.has(y) || o.push({ id: y, currentDepth: n.currentDepth + 1 });
        }
      }
      return Array.from(i).map((n) => a.get(n)).filter((n) => !!n).map((n) => ({ ...n }));
    },
    listPages(e) {
      let t = Array.from(a.values());
      if (e != null && e.type && (t = t.filter((n) => n.type === e.type)), e != null && e.tags && e.tags.length > 0) {
        const n = e.tags;
        t = t.filter((f) => {
          const g = f.tags;
          return g ? n.some((y) => g.includes(y)) : !1;
        });
      }
      const r = (e == null ? void 0 : e.sort) ?? "created", s = (e == null ? void 0 : e.order) ?? "desc";
      t.sort((n, f) => {
        let g = 0;
        return r === "title" ? g = n.title.localeCompare(f.title) : r === "created" ? g = n.created.getTime() - f.created.getTime() : g = n.modified.getTime() - f.modified.getTime(), s === "asc" ? g : -g;
      });
      const o = (e == null ? void 0 : e.offset) ?? 0, i = e == null ? void 0 : e.limit;
      if (i !== void 0 && i === 0)
        return [];
      if (o > 0 || i !== void 0) {
        const n = o, f = i !== void 0 ? n + i : void 0;
        t = t.slice(n, f);
      }
      return t.map((n) => ({ ...n }));
    },
    search(e, t) {
      if (!e || e.trim() === "")
        return [];
      const r = e.trim().toLowerCase(), s = (t == null ? void 0 : t.fields) ?? ["title", "content"], o = [];
      for (const n of a.values()) {
        if (t != null && t.type && n.type !== t.type)
          continue;
        let f = 0;
        if (s.includes("title")) {
          const g = n.title.toLowerCase();
          g === r ? f += 100 : g.includes(r) && (f += 50);
        }
        if (s.includes("content") && n.content.toLowerCase().includes(r) && (f += 10), s.includes("tags") && n.tags)
          for (const g of n.tags)
            g.toLowerCase().includes(r) && (f += 20);
        f > 0 && o.push({ page: { ...n }, score: f });
      }
      return o.sort((n, f) => f.score - n.score), (t != null && t.limit ? o.slice(0, t.limit) : o).map((n) => n.page);
    },
    getTags() {
      const e = /* @__PURE__ */ new Set();
      for (const t of a.values())
        if (t.tags)
          for (const r of t.tags)
            e.add(r);
      return Array.from(e).sort();
    },
    getPagesByTag(e) {
      var r;
      const t = [];
      for (const s of a.values())
        (r = s.tags) != null && r.includes(e) && t.push({ ...s });
      return t;
    },
    getTypes() {
      const e = /* @__PURE__ */ new Set();
      for (const t of a.values())
        t.type && e.add(t.type);
      return Array.from(e).sort();
    },
    getPagesByType(e) {
      const t = [];
      for (const r of a.values())
        r.type === e && t.push({ ...r });
      return t;
    },
    export() {
      return Array.from(a.values()).map((e) => ({ ...e }));
    },
    async import(e, t) {
      if (!Array.isArray(e))
        throw new Error("Pages must be an array");
      for (const i of e) {
        if (!i.id)
          throw new Error("Each page must have an id field");
        if (!i.title)
          throw new Error("Each page must have a title field");
      }
      const r = (t == null ? void 0 : t.mode) ?? "replace", s = (t == null ? void 0 : t.emitEvents) ?? !1;
      r === "replace" && (a.clear(), d.clear(), m.clear());
      let o = 0;
      for (const i of e) {
        if (r === "skip" && a.has(i.id))
          continue;
        const n = z(i), f = {
          ...n,
          created: n.created instanceof Date ? n.created : new Date(n.created),
          modified: n.modified instanceof Date ? n.modified : new Date(n.modified)
        };
        a.set(f.id, f), P(f.id, f.content), await c.save(f), o++, s && E({ type: "create", page: { ...f } });
      }
      return o;
    },
    toJSON() {
      const e = k.export();
      return JSON.stringify(e);
    },
    on(e, t) {
      return p.add(t), () => {
        p.delete(t);
      };
    },
    onChange(e) {
      return k.on("change", e);
    }
  };
  return k;
}
function F(l) {
  return l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export {
  M as StorageError,
  v as ValidationError,
  D as WikiError,
  G as createWiki,
  B as memoryStorage
};
