// Generated from lit.ts by pnpm run build. Do not edit.
// node_modules/.pnpm/@lit+reactive-element@2.1.2/node_modules/@lit/reactive-element/css-tag.js
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t = globalThis;
var e =
  t.ShadowRoot &&
  (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) &&
  "adoptedStyleSheets" in Document.prototype &&
  "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o8) {
    if (((this._$cssResult$ = true), o8 !== s))
      throw Error(
        "CSSResult is not constructable. Use `unsafeCSS` or `css` instead.",
      );
    ((this.cssText = t5), (this.t = e5));
  }
  get styleSheet() {
    let t5 = this.o;
    const s6 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s6 && 1 === s6.length;
      (e5 && (t5 = o.get(s6)),
        void 0 === t5 &&
          ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText),
          e5 && o.set(s6, t5)));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o8 =
    1 === t5.length
      ? t5[0]
      : e5.reduce(
          (e6, s6, o9) =>
            e6 +
            ((t6) => {
              if (true === t6._$cssResult$) return t6.cssText;
              if ("number" == typeof t6) return t6;
              throw Error(
                "Value passed to 'css' function must be a 'css' function result: " +
                  t6 +
                  ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.",
              );
            })(s6) +
            t5[o9 + 1],
          t5[0],
        );
  return new n(o8, t5, s);
};
var S = (s6, o8) => {
  if (e)
    s6.adoptedStyleSheets = o8.map((t5) =>
      t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet,
    );
  else
    for (const e5 of o8) {
      const o9 = document.createElement("style"),
        n6 = t.litNonce;
      (void 0 !== n6 && o9.setAttribute("nonce", n6),
        (o9.textContent = e5.cssText),
        s6.appendChild(o9));
    }
};
var c = e
  ? (t5) => t5
  : (t5) =>
      t5 instanceof CSSStyleSheet
        ? ((t6) => {
            let e5 = "";
            for (const s6 of t6.cssRules) e5 += s6.cssText;
            return r(e5);
          })(t5)
        : t5;

// node_modules/.pnpm/@lit+reactive-element@2.1.2/node_modules/@lit/reactive-element/reactive-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var {
  is: i2,
  defineProperty: e2,
  getOwnPropertyDescriptor: h,
  getOwnPropertyNames: r2,
  getOwnPropertySymbols: o2,
  getPrototypeOf: n2,
} = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s6) => t5;
var u = {
  toAttribute(t5, s6) {
    switch (s6) {
      case Boolean:
        t5 = t5 ? l : null;
        break;
      case Object:
      case Array:
        t5 = null == t5 ? t5 : JSON.stringify(t5);
    }
    return t5;
  },
  fromAttribute(t5, s6) {
    let i7 = t5;
    switch (s6) {
      case Boolean:
        i7 = null !== t5;
        break;
      case Number:
        i7 = null === t5 ? null : Number(t5);
        break;
      case Object:
      case Array:
        try {
          i7 = JSON.parse(t5);
        } catch (t6) {
          i7 = null;
        }
    }
    return i7;
  },
};
var f = (t5, s6) => !i2(t5, s6);
var b = {
  attribute: true,
  type: String,
  converter: u,
  reflect: false,
  useDefault: false,
  hasChanged: f,
};
((Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata")),
  (a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap()));
var y = class extends HTMLElement {
  static addInitializer(t5) {
    (this._$Ei(), (this.l ??= []).push(t5));
  }
  static get observedAttributes() {
    return (this.finalize(), this._$Eh && [...this._$Eh.keys()]);
  }
  static createProperty(t5, s6 = b) {
    if (
      (s6.state && (s6.attribute = false),
      this._$Ei(),
      this.prototype.hasOwnProperty(t5) &&
        ((s6 = Object.create(s6)).wrapped = true),
      this.elementProperties.set(t5, s6),
      !s6.noAccessor)
    ) {
      const i7 = /* @__PURE__ */ Symbol(),
        h5 = this.getPropertyDescriptor(t5, i7, s6);
      void 0 !== h5 && e2(this.prototype, t5, h5);
    }
  }
  static getPropertyDescriptor(t5, s6, i7) {
    const { get: e5, set: r6 } = h(this.prototype, t5) ?? {
      get() {
        return this[s6];
      },
      set(t6) {
        this[s6] = t6;
      },
    };
    return {
      get: e5,
      set(s7) {
        const h5 = e5?.call(this);
        (r6?.call(this, s7), this.requestUpdate(t5, h5, i7));
      },
      configurable: true,
      enumerable: true,
    };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    (t5.finalize(),
      void 0 !== t5.l && (this.l = [...t5.l]),
      (this.elementProperties = new Map(t5.elementProperties)));
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (
      ((this.finalized = true),
      this._$Ei(),
      this.hasOwnProperty(d("properties")))
    ) {
      const t6 = this.properties,
        s6 = [...r2(t6), ...o2(t6)];
      for (const i7 of s6) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s6 = litPropertyMetadata.get(t5);
      if (void 0 !== s6)
        for (const [t6, i7] of s6) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s6] of this.elementProperties) {
      const i7 = this._$Eu(t6, s6);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s6) {
    const i7 = [];
    if (Array.isArray(s6)) {
      const e5 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e5) i7.unshift(c(s7));
    } else void 0 !== s6 && i7.push(c(s6));
    return i7;
  }
  static _$Eu(t5, s6) {
    const i7 = s6.attribute;
    return false === i7
      ? void 0
      : "string" == typeof i7
        ? i7
        : "string" == typeof t5
          ? t5.toLowerCase()
          : void 0;
  }
  constructor() {
    (super(),
      (this._$Ep = void 0),
      (this.isUpdatePending = false),
      (this.hasUpdated = false),
      (this._$Em = null),
      this._$Ev());
  }
  _$Ev() {
    ((this._$ES = new Promise((t5) => (this.enableUpdating = t5))),
      (this._$AL = /* @__PURE__ */ new Map()),
      this._$E_(),
      this.requestUpdate(),
      this.constructor.l?.forEach((t5) => t5(this)));
  }
  addController(t5) {
    ((this._$EO ??= /* @__PURE__ */ new Set()).add(t5),
      void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.());
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(),
      s6 = this.constructor.elementProperties;
    for (const i7 of s6.keys())
      this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 =
      this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return (S(t5, this.constructor.elementStyles), t5);
  }
  connectedCallback() {
    ((this.renderRoot ??= this.createRenderRoot()),
      this.enableUpdating(true),
      this._$EO?.forEach((t5) => t5.hostConnected?.()));
  }
  enableUpdating(t5) {}
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s6, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s6) {
    const i7 = this.constructor.elementProperties.get(t5),
      e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h5 = (
        void 0 !== i7.converter?.toAttribute ? i7.converter : u
      ).toAttribute(s6, i7.type);
      ((this._$Em = t5),
        null == h5 ? this.removeAttribute(e5) : this.setAttribute(e5, h5),
        (this._$Em = null));
    }
  }
  _$AK(t5, s6) {
    const i7 = this.constructor,
      e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5),
        h5 =
          "function" == typeof t6.converter
            ? { fromAttribute: t6.converter }
            : void 0 !== t6.converter?.fromAttribute
              ? t6.converter
              : u;
      this._$Em = e5;
      const r6 = h5.fromAttribute(s6, t6.type);
      ((this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6), (this._$Em = null));
    }
  }
  requestUpdate(t5, s6, i7, e5 = false, h5) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (
        (false === e5 && (h5 = this[t5]),
        (i7 ??= r6.getPropertyOptions(t5)),
        !(
          (i7.hasChanged ?? f)(h5, s6) ||
          (i7.useDefault &&
            i7.reflect &&
            h5 === this._$Ej?.get(t5) &&
            !this.hasAttribute(r6._$Eu(t5, i7)))
        ))
      )
        return;
      this.C(t5, s6, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s6, { useDefault: i7, reflect: e5, wrapped: h5 }, r6) {
    (i7 &&
      !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) &&
      (this._$Ej.set(t5, r6 ?? s6 ?? this[t5]),
      true !== h5 || void 0 !== r6)) ||
      (this._$AL.has(t5) ||
        (this.hasUpdated || i7 || (s6 = void 0), this._$AL.set(t5, s6)),
      true === e5 &&
        this._$Em !== t5 &&
        (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return (null != t5 && (await t5), !this.isUpdatePending);
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (((this.renderRoot ??= this.createRenderRoot()), this._$Ep)) {
        for (const [t7, s7] of this._$Ep) this[t7] = s7;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0)
        for (const [s7, i7] of t6) {
          const { wrapped: t7 } = i7,
            e5 = this[s7];
          true !== t7 ||
            this._$AL.has(s7) ||
            void 0 === e5 ||
            this.C(s7, void 0, i7, e5);
        }
    }
    let t5 = false;
    const s6 = this._$AL;
    try {
      ((t5 = this.shouldUpdate(s6)),
        t5
          ? (this.willUpdate(s6),
            this._$EO?.forEach((t6) => t6.hostUpdate?.()),
            this.update(s6))
          : this._$EM());
    } catch (s7) {
      throw ((t5 = false), this._$EM(), s7);
    }
    t5 && this._$AE(s6);
  }
  willUpdate(t5) {}
  _$AE(t5) {
    (this._$EO?.forEach((t6) => t6.hostUpdated?.()),
      this.hasUpdated || ((this.hasUpdated = true), this.firstUpdated(t5)),
      this.updated(t5));
  }
  _$EM() {
    ((this._$AL = /* @__PURE__ */ new Map()), (this.isUpdatePending = false));
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    ((this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6]))),
      this._$EM());
  }
  updated(t5) {}
  firstUpdated(t5) {}
};
((y.elementStyles = []),
  (y.shadowRootOptions = { mode: "open" }),
  (y[d("elementProperties")] = /* @__PURE__ */ new Map()),
  (y[d("finalized")] = /* @__PURE__ */ new Map()),
  p?.({ ReactiveElement: y }),
  (a.reactiveElementVersions ??= []).push("2.1.2"));

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/lit-html.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) =>
  null === t5 || ("object" != typeof t5 && "function" != typeof t5);
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(
  `>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,
  "g",
);
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x =
  (t5) =>
  (i7, ...s6) => ({ _$litType$: t5, strings: i7, values: s6 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw"))
    throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s6 = t5.length - 1,
    e5 = [];
  let n6,
    l4 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "",
    c6 = v;
  for (let i8 = 0; i8 < s6; i8++) {
    const s7 = t5[i8];
    let a3,
      u5,
      d3 = -1,
      f4 = 0;
    for (
      ;
      f4 < s7.length && ((c6.lastIndex = f4), (u5 = c6.exec(s7)), null !== u5);

    )
      ((f4 = c6.lastIndex),
        c6 === v
          ? "!--" === u5[1]
            ? (c6 = _)
            : void 0 !== u5[1]
              ? (c6 = m)
              : void 0 !== u5[2]
                ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")),
                  (c6 = p2))
                : void 0 !== u5[3] && (c6 = p2)
          : c6 === p2
            ? ">" === u5[0]
              ? ((c6 = n6 ?? v), (d3 = -1))
              : void 0 === u5[1]
                ? (d3 = -2)
                : ((d3 = c6.lastIndex - u5[2].length),
                  (a3 = u5[1]),
                  (c6 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g))
            : c6 === $ || c6 === g
              ? (c6 = p2)
              : c6 === _ || c6 === m
                ? (c6 = v)
                : ((c6 = p2), (n6 = void 0)));
    const x2 = c6 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l4 +=
      c6 === v
        ? s7 + r3
        : d3 >= 0
          ? (e5.push(a3), s7.slice(0, d3) + h2 + s7.slice(d3) + o3 + x2)
          : s7 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [
    V(
      t5,
      l4 +
        (t5[s6] || "<?>") +
        (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : ""),
    ),
    e5,
  ];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r6;
    this.parts = [];
    let l4 = 0,
      a3 = 0;
    const u5 = t5.length - 1,
      d3 = this.parts,
      [f4, v3] = N(t5, i7);
    if (
      ((this.el = _S.createElement(f4, e5)),
      (P.currentNode = this.el.content),
      2 === i7 || 3 === i7)
    ) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes())
          for (const t6 of r6.getAttributeNames())
            if (t6.endsWith(h2)) {
              const i8 = v3[a3++],
                s6 = r6.getAttribute(t6).split(o3),
                e6 = /([.?@])?(.*)/.exec(i8);
              (d3.push({
                type: 1,
                index: l4,
                name: e6[2],
                strings: s6,
                ctor:
                  "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H,
              }),
                r6.removeAttribute(t6));
            } else
              t6.startsWith(o3) &&
                (d3.push({ type: 6, index: l4 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3),
            i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i8; s6++)
              (r6.append(t6[s6], c3()),
                P.nextNode(),
                d3.push({ type: 2, index: ++l4 }));
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType)
        if (r6.data === n3) d3.push({ type: 2, index: l4 });
        else {
          let t6 = -1;
          for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); )
            (d3.push({ type: 7, index: l4 }), (t6 += o3.length - 1));
        }
      l4++;
    }
  }
  static createElement(t5, i7) {
    const s6 = l2.createElement("template");
    return ((s6.innerHTML = t5), s6);
  }
};
function M(t5, i7, s6 = t5, e5) {
  if (i7 === E) return i7;
  let h5 = void 0 !== e5 ? s6._$Co?.[e5] : s6._$Cl;
  const o8 = a2(i7) ? void 0 : i7._$litDirective$;
  return (
    h5?.constructor !== o8 &&
      (h5?._$AO?.(false),
      void 0 === o8 ? (h5 = void 0) : ((h5 = new o8(t5)), h5._$AT(t5, s6, e5)),
      void 0 !== e5 ? ((s6._$Co ??= [])[e5] = h5) : (s6._$Cl = h5)),
    void 0 !== h5 && (i7 = M(t5, h5._$AS(t5, i7.values), h5, e5)),
    i7
  );
}
var R = class {
  constructor(t5, i7) {
    ((this._$AV = []),
      (this._$AN = void 0),
      (this._$AD = t5),
      (this._$AM = i7));
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const {
        el: { content: i7 },
        parts: s6,
      } = this._$AD,
      e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h5 = P.nextNode(),
      o8 = 0,
      n6 = 0,
      r6 = s6[0];
    for (; void 0 !== r6; ) {
      if (o8 === r6.index) {
        let i8;
        (2 === r6.type
          ? (i8 = new k(h5, h5.nextSibling, this, t5))
          : 1 === r6.type
            ? (i8 = new r6.ctor(h5, r6.name, r6.strings, this, t5))
            : 6 === r6.type && (i8 = new Z(h5, this, t5)),
          this._$AV.push(i8),
          (r6 = s6[++n6]));
      }
      o8 !== r6?.index && ((h5 = P.nextNode()), o8++);
    }
    return ((P.currentNode = l2), e5);
  }
  p(t5) {
    let i7 = 0;
    for (const s6 of this._$AV)
      (void 0 !== s6 &&
        (void 0 !== s6.strings
          ? (s6._$AI(t5, s6, i7), (i7 += s6.strings.length - 2))
          : s6._$AI(t5[i7])),
        i7++);
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s6, e5) {
    ((this.type = 2),
      (this._$AH = A),
      (this._$AN = void 0),
      (this._$AA = t5),
      (this._$AB = i7),
      (this._$AM = s6),
      (this.options = e5),
      (this._$Cv = e5?.isConnected ?? true));
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return (void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5);
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    ((t5 = M(this, t5, i7)),
      a2(t5)
        ? t5 === A || null == t5 || "" === t5
          ? (this._$AH !== A && this._$AR(), (this._$AH = A))
          : t5 !== this._$AH && t5 !== E && this._(t5)
        : void 0 !== t5._$litType$
          ? this.$(t5)
          : void 0 !== t5.nodeType
            ? this.T(t5)
            : d2(t5)
              ? this.k(t5)
              : this._(t5));
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), (this._$AH = this.O(t5)));
  }
  _(t5) {
    (this._$AH !== A && a2(this._$AH)
      ? (this._$AA.nextSibling.data = t5)
      : this.T(l2.createTextNode(t5)),
      (this._$AH = t5));
  }
  $(t5) {
    const { values: i7, _$litType$: s6 } = t5,
      e5 =
        "number" == typeof s6
          ? this._$AC(t5)
          : (void 0 === s6.el &&
              (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)),
            s6);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this),
        s7 = t6.u(this.options);
      (t6.p(i7), this.T(s7), (this._$AH = t6));
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return (void 0 === i7 && C.set(t5.strings, (i7 = new S2(t5))), i7);
  }
  k(t5) {
    u2(this._$AH) || ((this._$AH = []), this._$AR());
    const i7 = this._$AH;
    let s6,
      e5 = 0;
    for (const h5 of t5)
      (e5 === i7.length
        ? i7.push((s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)))
        : (s6 = i7[e5]),
        s6._$AI(h5),
        e5++);
    e5 < i7.length &&
      (this._$AR(s6 && s6._$AB.nextSibling, e5), (i7.length = e5));
  }
  _$AR(t5 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t5 !== this._$AB; ) {
      const s7 = i3(t5).nextSibling;
      (i3(t5).remove(), (t5 = s7));
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && ((this._$Cv = t5), this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s6, e5, h5) {
    ((this.type = 1),
      (this._$AH = A),
      (this._$AN = void 0),
      (this.element = t5),
      (this.name = i7),
      (this._$AM = e5),
      (this.options = h5),
      s6.length > 2 || "" !== s6[0] || "" !== s6[1]
        ? ((this._$AH = Array(s6.length - 1).fill(new String())),
          (this.strings = s6))
        : (this._$AH = A));
  }
  _$AI(t5, i7 = this, s6, e5) {
    const h5 = this.strings;
    let o8 = false;
    if (void 0 === h5)
      ((t5 = M(this, t5, i7, 0)),
        (o8 = !a2(t5) || (t5 !== this._$AH && t5 !== E)),
        o8 && (this._$AH = t5));
    else {
      const e6 = t5;
      let n6, r6;
      for (t5 = h5[0], n6 = 0; n6 < h5.length - 1; n6++)
        ((r6 = M(this, e6[s6 + n6], i7, n6)),
          r6 === E && (r6 = this._$AH[n6]),
          (o8 ||= !a2(r6) || r6 !== this._$AH[n6]),
          r6 === A ? (t5 = A) : t5 !== A && (t5 += (r6 ?? "") + h5[n6 + 1]),
          (this._$AH[n6] = r6));
    }
    o8 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A
      ? this.element.removeAttribute(this.name)
      : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    (super(...arguments), (this.type = 3));
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    (super(...arguments), (this.type = 4));
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s6, e5, h5) {
    (super(t5, i7, s6, e5, h5), (this.type = 5));
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s6 = this._$AH,
      e5 =
        (t5 === A && s6 !== A) ||
        t5.capture !== s6.capture ||
        t5.once !== s6.once ||
        t5.passive !== s6.passive,
      h5 = t5 !== A && (s6 === A || e5);
    (e5 && this.element.removeEventListener(this.name, this, s6),
      h5 && this.element.addEventListener(this.name, this, t5),
      (this._$AH = t5));
  }
  handleEvent(t5) {
    "function" == typeof this._$AH
      ? this._$AH.call(this.options?.host ?? this.element, t5)
      : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s6) {
    ((this.element = t5),
      (this.type = 6),
      (this._$AN = void 0),
      (this._$AM = i7),
      (this.options = s6));
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = {
  M: h2,
  P: o3,
  A: n3,
  C: 1,
  L: N,
  R,
  D: d2,
  V: M,
  I: k,
  H,
  N: L,
  U: z,
  B: I,
  F: Z,
};
var B = t2.litHtmlPolyfillSupport;
(B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3"));
var D = (t5, i7, s6) => {
  const e5 = s6?.renderBefore ?? i7;
  let h5 = e5._$litPart$;
  if (void 0 === h5) {
    const t6 = s6?.renderBefore ?? null;
    e5._$litPart$ = h5 = new k(i7.insertBefore(c3(), t6), t6, void 0, s6 ?? {});
  }
  return (h5._$AI(t5), h5);
};

// node_modules/.pnpm/lit-element@4.2.2/node_modules/lit-element/lit-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    (super(...arguments),
      (this.renderOptions = { host: this }),
      (this._$Do = void 0));
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return ((this.renderOptions.renderBefore ??= t5.firstChild), t5);
  }
  update(t5) {
    const r6 = this.render();
    (this.hasUpdated || (this.renderOptions.isConnected = this.isConnected),
      super.update(t5),
      (this._$Do = D(r6, this.renderRoot, this.renderOptions)));
  }
  connectedCallback() {
    (super.connectedCallback(), this._$Do?.setConnected(true));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(), this._$Do?.setConnected(false));
  }
  render() {
    return E;
  }
};
((i4._$litElement$ = true),
  (i4["finalized"] = true),
  s3.litElementHydrateSupport?.({ LitElement: i4 }));
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/is-server.js
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directive-helpers.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { I: t3 } = j;
var i5 = (o8) => o8;
var r4 = (o8) => void 0 === o8.strings;
var s4 = () => document.createComment("");
var v2 = (o8, n6, e5) => {
  const l4 = o8._$AA.parentNode,
    d3 = void 0 === n6 ? o8._$AB : n6._$AA;
  if (void 0 === e5) {
    const i7 = l4.insertBefore(s4(), d3),
      n7 = l4.insertBefore(s4(), d3);
    e5 = new t3(i7, n7, o8, o8.options);
  } else {
    const t5 = e5._$AB.nextSibling,
      n7 = e5._$AM,
      c6 = n7 !== o8;
    if (c6) {
      let t6;
      (e5._$AQ?.(o8),
        (e5._$AM = o8),
        void 0 !== e5._$AP && (t6 = o8._$AU) !== n7._$AU && e5._$AP(t6));
    }
    if (t5 !== d3 || c6) {
      let o9 = e5._$AA;
      for (; o9 !== t5; ) {
        const t6 = i5(o9).nextSibling;
        (i5(l4).insertBefore(o9, d3), (o9 = t6));
      }
    }
  }
  return e5;
};
var u3 = (o8, t5, i7 = o8) => (o8._$AI(t5, i7), o8);
var m2 = {};
var p3 = (o8, t5 = m2) => (o8._$AH = t5);
var M2 = (o8) => o8._$AH;
var h3 = (o8) => {
  (o8._$AR(), o8._$AA.remove());
};

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directive.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t4 = {
  ATTRIBUTE: 1,
  CHILD: 2,
  PROPERTY: 3,
  BOOLEAN_ATTRIBUTE: 4,
  EVENT: 5,
  ELEMENT: 6,
};
var e4 =
  (t5) =>
  (...e5) => ({ _$litDirective$: t5, values: e5 });
var i6 = class {
  constructor(t5) {}
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    ((this._$Ct = t5), (this._$AM = e5), (this._$Ci = i7));
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/async-directive.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var s5 = (i7, t5) => {
  const e5 = i7._$AN;
  if (void 0 === e5) return false;
  for (const i8 of e5) (i8._$AO?.(t5, false), s5(i8, t5));
  return true;
};
var o5 = (i7) => {
  let t5, e5;
  do {
    if (void 0 === (t5 = i7._$AM)) break;
    ((e5 = t5._$AN), e5.delete(i7), (i7 = t5));
  } while (0 === e5?.size);
};
var r5 = (i7) => {
  for (let t5; (t5 = i7._$AM); i7 = t5) {
    let e5 = t5._$AN;
    if (void 0 === e5) t5._$AN = e5 = /* @__PURE__ */ new Set();
    else if (e5.has(i7)) break;
    (e5.add(i7), c4(t5));
  }
};
function h4(i7) {
  void 0 !== this._$AN
    ? (o5(this), (this._$AM = i7), r5(this))
    : (this._$AM = i7);
}
function n4(i7, t5 = false, e5 = 0) {
  const r6 = this._$AH,
    h5 = this._$AN;
  if (void 0 !== h5 && 0 !== h5.size)
    if (t5)
      if (Array.isArray(r6))
        for (let i8 = e5; i8 < r6.length; i8++) (s5(r6[i8], false), o5(r6[i8]));
      else null != r6 && (s5(r6, false), o5(r6));
    else s5(this, i7);
}
var c4 = (i7) => {
  i7.type == t4.CHILD && ((i7._$AP ??= n4), (i7._$AQ ??= h4));
};
var f3 = class extends i6 {
  constructor() {
    (super(...arguments), (this._$AN = void 0));
  }
  _$AT(i7, t5, e5) {
    (super._$AT(i7, t5, e5), r5(this), (this.isConnected = i7._$AU));
  }
  _$AO(i7, t5 = true) {
    (i7 !== this.isConnected &&
      ((this.isConnected = i7),
      i7 ? this.reconnected?.() : this.disconnected?.()),
      t5 && (s5(this, i7), o5(this)));
  }
  setValue(t5) {
    if (r4(this._$Ct)) this._$Ct._$AI(t5, this);
    else {
      const i7 = [...this._$Ct._$AH];
      ((i7[this._$Ci] = t5), this._$Ct._$AI(i7, this, 0));
    }
  }
  disconnected() {}
  reconnected() {}
};

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/ref.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var o6 = /* @__PURE__ */ new WeakMap();
var n5 = e4(
  class extends f3 {
    render(i7) {
      return A;
    }
    update(i7, [s6]) {
      const e5 = s6 !== this.G;
      return (
        e5 && this.rt(void 0),
        (e5 || this.lt !== this.ct) &&
          ((this.G = s6),
          (this.ht = i7.options?.host),
          this.rt((this.ct = i7.element))),
        A
      );
    }
    rt(t5) {
      if (void 0 !== this.G)
        if ((this.isConnected || (t5 = void 0), "function" == typeof this.G)) {
          const i7 = this.ht ?? globalThis;
          let s6 = o6.get(i7);
          (void 0 === s6 &&
            ((s6 = /* @__PURE__ */ new WeakMap()), o6.set(i7, s6)),
            void 0 !== s6.get(this.G) && this.G.call(this.ht, void 0),
            s6.set(this.G, t5),
            void 0 !== t5 && this.G.call(this.ht, t5));
        } else this.G.value = t5;
    }
    get lt() {
      return "function" == typeof this.G
        ? o6.get(this.ht ?? globalThis)?.get(this.G)
        : this.G?.value;
    }
    disconnected() {
      this.lt === this.ct && this.rt(void 0);
    }
    reconnected() {
      this.rt(this.ct);
    }
  },
);

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/if-defined.js
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var o7 = (o8) => o8 ?? A;

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/repeat.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var u4 = (e5, s6, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l4 = s6; l4 <= t5; l4++) r6.set(e5[l4], l4);
  return r6;
};
var c5 = e4(
  class extends i6 {
    constructor(e5) {
      if ((super(e5), e5.type !== t4.CHILD))
        throw Error("repeat() can only be used in text expressions");
    }
    dt(e5, s6, t5) {
      let r6;
      void 0 === t5 ? (t5 = s6) : void 0 !== s6 && (r6 = s6);
      const l4 = [],
        o8 = [];
      let i7 = 0;
      for (const s7 of e5)
        ((l4[i7] = r6 ? r6(s7, i7) : i7), (o8[i7] = t5(s7, i7)), i7++);
      return { values: o8, keys: l4 };
    }
    render(e5, s6, t5) {
      return this.dt(e5, s6, t5).values;
    }
    update(s6, [t5, r6, c6]) {
      const d3 = M2(s6),
        { values: p4, keys: a3 } = this.dt(t5, r6, c6);
      if (!Array.isArray(d3)) return ((this.ut = a3), p4);
      const h5 = (this.ut ??= []),
        v3 = [];
      let m3,
        y3,
        x2 = 0,
        j2 = d3.length - 1,
        k2 = 0,
        w2 = p4.length - 1;
      for (; x2 <= j2 && k2 <= w2; )
        if (null === d3[x2]) x2++;
        else if (null === d3[j2]) j2--;
        else if (h5[x2] === a3[k2]) ((v3[k2] = u3(d3[x2], p4[k2])), x2++, k2++);
        else if (h5[j2] === a3[w2]) ((v3[w2] = u3(d3[j2], p4[w2])), j2--, w2--);
        else if (h5[x2] === a3[w2])
          ((v3[w2] = u3(d3[x2], p4[w2])),
            v2(s6, v3[w2 + 1], d3[x2]),
            x2++,
            w2--);
        else if (h5[j2] === a3[k2])
          ((v3[k2] = u3(d3[j2], p4[k2])), v2(s6, d3[x2], d3[j2]), j2--, k2++);
        else if (
          (void 0 === m3 && ((m3 = u4(a3, k2, w2)), (y3 = u4(h5, x2, j2))),
          m3.has(h5[x2]))
        )
          if (m3.has(h5[j2])) {
            const e5 = y3.get(a3[k2]),
              t6 = void 0 !== e5 ? d3[e5] : null;
            if (null === t6) {
              const e6 = v2(s6, d3[x2]);
              (u3(e6, p4[k2]), (v3[k2] = e6));
            } else
              ((v3[k2] = u3(t6, p4[k2])), v2(s6, d3[x2], t6), (d3[e5] = null));
            k2++;
          } else (h3(d3[j2]), j2--);
        else (h3(d3[x2]), x2++);
      for (; k2 <= w2; ) {
        const e5 = v2(s6, v3[w2 + 1]);
        (u3(e5, p4[k2]), (v3[k2++] = e5));
      }
      for (; x2 <= j2; ) {
        const e5 = d3[x2++];
        null !== e5 && h3(e5);
      }
      return ((this.ut = a3), p3(s6, v3), E);
    }
  },
);

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/live.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var l3 = e4(
  class extends i6 {
    constructor(r6) {
      if (
        (super(r6),
        r6.type !== t4.PROPERTY &&
          r6.type !== t4.ATTRIBUTE &&
          r6.type !== t4.BOOLEAN_ATTRIBUTE)
      )
        throw Error(
          "The `live` directive is not allowed on child or event bindings",
        );
      if (!r4(r6))
        throw Error("`live` bindings can only contain a single expression");
    }
    render(r6) {
      return r6;
    }
    update(i7, [t5]) {
      if (t5 === E || t5 === A) return t5;
      const o8 = i7.element,
        l4 = i7.name;
      if (i7.type === t4.PROPERTY) {
        if (t5 === o8[l4]) return E;
      } else if (i7.type === t4.BOOLEAN_ATTRIBUTE) {
        if (!!t5 === o8.hasAttribute(l4)) return E;
      } else if (i7.type === t4.ATTRIBUTE && o8.getAttribute(l4) === t5 + "")
        return E;
      return (p3(i7), t5);
    }
  },
);
export {
  i4 as LitElement,
  i as css,
  b2 as html,
  o7 as ifDefined,
  l3 as live,
  A as nothing,
  n5 as ref,
  D as render,
  c5 as repeat,
};
