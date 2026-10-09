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
  constructor(t5, e5, o9) {
    if (((this._$cssResult$ = true), o9 !== s))
      throw Error(
        "CSSResult is not constructable. Use `unsafeCSS` or `css` instead.",
      );
    ((this.cssText = t5), (this.t = e5));
  }
  get styleSheet() {
    let t5 = this.o;
    const s7 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s7 && 1 === s7.length;
      (e5 && (t5 = o.get(s7)),
        void 0 === t5 &&
          ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText),
          e5 && o.set(s7, t5)));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o9 =
    1 === t5.length
      ? t5[0]
      : e5.reduce(
          (e6, s7, o10) =>
            e6 +
            ((t6) => {
              if (true === t6._$cssResult$) return t6.cssText;
              if ("number" == typeof t6) return t6;
              throw Error(
                "Value passed to 'css' function must be a 'css' function result: " +
                  t6 +
                  ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.",
              );
            })(s7) +
            t5[o10 + 1],
          t5[0],
        );
  return new n(o9, t5, s);
};
var S = (s7, o9) => {
  if (e)
    s7.adoptedStyleSheets = o9.map((t5) =>
      t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet,
    );
  else
    for (const e5 of o9) {
      const o10 = document.createElement("style"),
        n7 = t.litNonce;
      (void 0 !== n7 && o10.setAttribute("nonce", n7),
        (o10.textContent = e5.cssText),
        s7.appendChild(o10));
    }
};
var c = e
  ? (t5) => t5
  : (t5) =>
      t5 instanceof CSSStyleSheet
        ? ((t6) => {
            let e5 = "";
            for (const s7 of t6.cssRules) e5 += s7.cssText;
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
var d = (t5, s7) => t5;
var u = {
  toAttribute(t5, s7) {
    switch (s7) {
      case Boolean:
        t5 = t5 ? l : null;
        break;
      case Object:
      case Array:
        t5 = null == t5 ? t5 : JSON.stringify(t5);
    }
    return t5;
  },
  fromAttribute(t5, s7) {
    let i7 = t5;
    switch (s7) {
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
var f = (t5, s7) => !i2(t5, s7);
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
  static createProperty(t5, s7 = b) {
    if (
      (s7.state && (s7.attribute = false),
      this._$Ei(),
      this.prototype.hasOwnProperty(t5) &&
        ((s7 = Object.create(s7)).wrapped = true),
      this.elementProperties.set(t5, s7),
      !s7.noAccessor)
    ) {
      const i7 = /* @__PURE__ */ Symbol(),
        h5 = this.getPropertyDescriptor(t5, i7, s7);
      void 0 !== h5 && e2(this.prototype, t5, h5);
    }
  }
  static getPropertyDescriptor(t5, s7, i7) {
    const { get: e5, set: r6 } = h(this.prototype, t5) ?? {
      get() {
        return this[s7];
      },
      set(t6) {
        this[s7] = t6;
      },
    };
    return {
      get: e5,
      set(s8) {
        const h5 = e5?.call(this);
        (r6?.call(this, s8), this.requestUpdate(t5, h5, i7));
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
        s7 = [...r2(t6), ...o2(t6)];
      for (const i7 of s7) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s7 = litPropertyMetadata.get(t5);
      if (void 0 !== s7)
        for (const [t6, i7] of s7) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s7] of this.elementProperties) {
      const i7 = this._$Eu(t6, s7);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s7) {
    const i7 = [];
    if (Array.isArray(s7)) {
      const e5 = new Set(s7.flat(1 / 0).reverse());
      for (const s8 of e5) i7.unshift(c(s8));
    } else void 0 !== s7 && i7.push(c(s7));
    return i7;
  }
  static _$Eu(t5, s7) {
    const i7 = s7.attribute;
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
      s7 = this.constructor.elementProperties;
    for (const i7 of s7.keys())
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
  attributeChangedCallback(t5, s7, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s7) {
    const i7 = this.constructor.elementProperties.get(t5),
      e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h5 = (
        void 0 !== i7.converter?.toAttribute ? i7.converter : u
      ).toAttribute(s7, i7.type);
      ((this._$Em = t5),
        null == h5 ? this.removeAttribute(e5) : this.setAttribute(e5, h5),
        (this._$Em = null));
    }
  }
  _$AK(t5, s7) {
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
      const r6 = h5.fromAttribute(s7, t6.type);
      ((this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6), (this._$Em = null));
    }
  }
  requestUpdate(t5, s7, i7, e5 = false, h5) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (
        (false === e5 && (h5 = this[t5]),
        (i7 ??= r6.getPropertyOptions(t5)),
        !(
          (i7.hasChanged ?? f)(h5, s7) ||
          (i7.useDefault &&
            i7.reflect &&
            h5 === this._$Ej?.get(t5) &&
            !this.hasAttribute(r6._$Eu(t5, i7)))
        ))
      )
        return;
      this.C(t5, s7, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s7, { useDefault: i7, reflect: e5, wrapped: h5 }, r6) {
    (i7 &&
      !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) &&
      (this._$Ej.set(t5, r6 ?? s7 ?? this[t5]),
      true !== h5 || void 0 !== r6)) ||
      (this._$AL.has(t5) ||
        (this.hasUpdated || i7 || (s7 = void 0), this._$AL.set(t5, s7)),
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
        for (const [t7, s8] of this._$Ep) this[t7] = s8;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0)
        for (const [s8, i7] of t6) {
          const { wrapped: t7 } = i7,
            e5 = this[s8];
          true !== t7 ||
            this._$AL.has(s8) ||
            void 0 === e5 ||
            this.C(s8, void 0, i7, e5);
        }
    }
    let t5 = false;
    const s7 = this._$AL;
    try {
      ((t5 = this.shouldUpdate(s7)),
        t5
          ? (this.willUpdate(s7),
            this._$EO?.forEach((t6) => t6.hostUpdate?.()),
            this.update(s7))
          : this._$EM());
    } catch (s8) {
      throw ((t5 = false), this._$EM(), s8);
    }
    t5 && this._$AE(s7);
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
  (i7, ...s7) => ({ _$litType$: t5, strings: i7, values: s7 });
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
  const s7 = t5.length - 1,
    e5 = [];
  let n7,
    l5 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "",
    c7 = v;
  for (let i8 = 0; i8 < s7; i8++) {
    const s8 = t5[i8];
    let a4,
      u6,
      d3 = -1,
      f4 = 0;
    for (
      ;
      f4 < s8.length && ((c7.lastIndex = f4), (u6 = c7.exec(s8)), null !== u6);

    )
      ((f4 = c7.lastIndex),
        c7 === v
          ? "!--" === u6[1]
            ? (c7 = _)
            : void 0 !== u6[1]
              ? (c7 = m)
              : void 0 !== u6[2]
                ? (y2.test(u6[2]) && (n7 = RegExp("</" + u6[2], "g")),
                  (c7 = p2))
                : void 0 !== u6[3] && (c7 = p2)
          : c7 === p2
            ? ">" === u6[0]
              ? ((c7 = n7 ?? v), (d3 = -1))
              : void 0 === u6[1]
                ? (d3 = -2)
                : ((d3 = c7.lastIndex - u6[2].length),
                  (a4 = u6[1]),
                  (c7 = void 0 === u6[3] ? p2 : '"' === u6[3] ? $ : g))
            : c7 === $ || c7 === g
              ? (c7 = p2)
              : c7 === _ || c7 === m
                ? (c7 = v)
                : ((c7 = p2), (n7 = void 0)));
    const x2 = c7 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l5 +=
      c7 === v
        ? s8 + r3
        : d3 >= 0
          ? (e5.push(a4), s8.slice(0, d3) + h2 + s8.slice(d3) + o3 + x2)
          : s8 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [
    V(
      t5,
      l5 +
        (t5[s7] || "<?>") +
        (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : ""),
    ),
    e5,
  ];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r6;
    this.parts = [];
    let l5 = 0,
      a4 = 0;
    const u6 = t5.length - 1,
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
    for (; null !== (r6 = P.nextNode()) && d3.length < u6; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes())
          for (const t6 of r6.getAttributeNames())
            if (t6.endsWith(h2)) {
              const i8 = v3[a4++],
                s7 = r6.getAttribute(t6).split(o3),
                e6 = /([.?@])?(.*)/.exec(i8);
              (d3.push({
                type: 1,
                index: l5,
                name: e6[2],
                strings: s7,
                ctor:
                  "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H,
              }),
                r6.removeAttribute(t6));
            } else
              t6.startsWith(o3) &&
                (d3.push({ type: 6, index: l5 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3),
            i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s7 = 0; s7 < i8; s7++)
              (r6.append(t6[s7], c3()),
                P.nextNode(),
                d3.push({ type: 2, index: ++l5 }));
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType)
        if (r6.data === n3) d3.push({ type: 2, index: l5 });
        else {
          let t6 = -1;
          for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); )
            (d3.push({ type: 7, index: l5 }), (t6 += o3.length - 1));
        }
      l5++;
    }
  }
  static createElement(t5, i7) {
    const s7 = l2.createElement("template");
    return ((s7.innerHTML = t5), s7);
  }
};
function M(t5, i7, s7 = t5, e5) {
  if (i7 === E) return i7;
  let h5 = void 0 !== e5 ? s7._$Co?.[e5] : s7._$Cl;
  const o9 = a2(i7) ? void 0 : i7._$litDirective$;
  return (
    h5?.constructor !== o9 &&
      (h5?._$AO?.(false),
      void 0 === o9 ? (h5 = void 0) : ((h5 = new o9(t5)), h5._$AT(t5, s7, e5)),
      void 0 !== e5 ? ((s7._$Co ??= [])[e5] = h5) : (s7._$Cl = h5)),
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
        parts: s7,
      } = this._$AD,
      e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h5 = P.nextNode(),
      o9 = 0,
      n7 = 0,
      r6 = s7[0];
    for (; void 0 !== r6; ) {
      if (o9 === r6.index) {
        let i8;
        (2 === r6.type
          ? (i8 = new k(h5, h5.nextSibling, this, t5))
          : 1 === r6.type
            ? (i8 = new r6.ctor(h5, r6.name, r6.strings, this, t5))
            : 6 === r6.type && (i8 = new Z(h5, this, t5)),
          this._$AV.push(i8),
          (r6 = s7[++n7]));
      }
      o9 !== r6?.index && ((h5 = P.nextNode()), o9++);
    }
    return ((P.currentNode = l2), e5);
  }
  p(t5) {
    let i7 = 0;
    for (const s7 of this._$AV)
      (void 0 !== s7 &&
        (void 0 !== s7.strings
          ? (s7._$AI(t5, s7, i7), (i7 += s7.strings.length - 2))
          : s7._$AI(t5[i7])),
        i7++);
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s7, e5) {
    ((this.type = 2),
      (this._$AH = A),
      (this._$AN = void 0),
      (this._$AA = t5),
      (this._$AB = i7),
      (this._$AM = s7),
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
    const { values: i7, _$litType$: s7 } = t5,
      e5 =
        "number" == typeof s7
          ? this._$AC(t5)
          : (void 0 === s7.el &&
              (s7.el = S2.createElement(V(s7.h, s7.h[0]), this.options)),
            s7);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this),
        s8 = t6.u(this.options);
      (t6.p(i7), this.T(s8), (this._$AH = t6));
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return (void 0 === i7 && C.set(t5.strings, (i7 = new S2(t5))), i7);
  }
  k(t5) {
    u2(this._$AH) || ((this._$AH = []), this._$AR());
    const i7 = this._$AH;
    let s7,
      e5 = 0;
    for (const h5 of t5)
      (e5 === i7.length
        ? i7.push((s7 = new _k(this.O(c3()), this.O(c3()), this, this.options)))
        : (s7 = i7[e5]),
        s7._$AI(h5),
        e5++);
    e5 < i7.length &&
      (this._$AR(s7 && s7._$AB.nextSibling, e5), (i7.length = e5));
  }
  _$AR(t5 = this._$AA.nextSibling, s7) {
    for (this._$AP?.(false, true, s7); t5 !== this._$AB; ) {
      const s8 = i3(t5).nextSibling;
      (i3(t5).remove(), (t5 = s8));
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
  constructor(t5, i7, s7, e5, h5) {
    ((this.type = 1),
      (this._$AH = A),
      (this._$AN = void 0),
      (this.element = t5),
      (this.name = i7),
      (this._$AM = e5),
      (this.options = h5),
      s7.length > 2 || "" !== s7[0] || "" !== s7[1]
        ? ((this._$AH = Array(s7.length - 1).fill(new String())),
          (this.strings = s7))
        : (this._$AH = A));
  }
  _$AI(t5, i7 = this, s7, e5) {
    const h5 = this.strings;
    let o9 = false;
    if (void 0 === h5)
      ((t5 = M(this, t5, i7, 0)),
        (o9 = !a2(t5) || (t5 !== this._$AH && t5 !== E)),
        o9 && (this._$AH = t5));
    else {
      const e6 = t5;
      let n7, r6;
      for (t5 = h5[0], n7 = 0; n7 < h5.length - 1; n7++)
        ((r6 = M(this, e6[s7 + n7], i7, n7)),
          r6 === E && (r6 = this._$AH[n7]),
          (o9 ||= !a2(r6) || r6 !== this._$AH[n7]),
          r6 === A ? (t5 = A) : t5 !== A && (t5 += (r6 ?? "") + h5[n7 + 1]),
          (this._$AH[n7] = r6));
    }
    o9 && !e5 && this.j(t5);
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
  constructor(t5, i7, s7, e5, h5) {
    (super(t5, i7, s7, e5, h5), (this.type = 5));
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s7 = this._$AH,
      e5 =
        (t5 === A && s7 !== A) ||
        t5.capture !== s7.capture ||
        t5.once !== s7.once ||
        t5.passive !== s7.passive,
      h5 = t5 !== A && (s7 === A || e5);
    (e5 && this.element.removeEventListener(this.name, this, s7),
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
  constructor(t5, i7, s7) {
    ((this.element = t5),
      (this.type = 6),
      (this._$AN = void 0),
      (this._$AM = i7),
      (this.options = s7));
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
var D = (t5, i7, s7) => {
  const e5 = s7?.renderBefore ?? i7;
  let h5 = e5._$litPart$;
  if (void 0 === h5) {
    const t6 = s7?.renderBefore ?? null;
    e5._$litPart$ = h5 = new k(i7.insertBefore(c3(), t6), t6, void 0, s7 ?? {});
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

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/static.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var a3 = /* @__PURE__ */ Symbol.for("");
var o5 = (t5) => {
  if (t5?.r === a3) return t5?._$litStatic$;
};
var s4 = (t5) => ({ _$litStatic$: t5, r: a3 });
var l3 = /* @__PURE__ */ new Map();
var n4 =
  (t5) =>
  (r6, ...e5) => {
    const a4 = e5.length;
    let s7, i7;
    const n7 = [],
      u6 = [];
    let c7,
      $3 = 0,
      f4 = false;
    for (; $3 < a4; ) {
      for (c7 = r6[$3]; $3 < a4 && void 0 !== ((i7 = e5[$3]), (s7 = o5(i7))); )
        ((c7 += s7 + r6[++$3]), (f4 = true));
      ($3 !== a4 && u6.push(i7), n7.push(c7), $3++);
    }
    if (($3 === a4 && n7.push(r6[a4]), f4)) {
      const t6 = n7.join("$$lit$$");
      (void 0 === (r6 = l3.get(t6)) && ((n7.raw = n7), l3.set(t6, (r6 = n7))),
        (e5 = u6));
    }
    return t5(r6, ...e5);
  };
var u3 = n4(b2);
var c4 = n4(w);
var $2 = n4(T);

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directive-helpers.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { I: t3 } = j;
var i5 = (o9) => o9;
var r4 = (o9) => void 0 === o9.strings;
var s5 = () => document.createComment("");
var v2 = (o9, n7, e5) => {
  const l5 = o9._$AA.parentNode,
    d3 = void 0 === n7 ? o9._$AB : n7._$AA;
  if (void 0 === e5) {
    const i7 = l5.insertBefore(s5(), d3),
      n8 = l5.insertBefore(s5(), d3);
    e5 = new t3(i7, n8, o9, o9.options);
  } else {
    const t5 = e5._$AB.nextSibling,
      n8 = e5._$AM,
      c7 = n8 !== o9;
    if (c7) {
      let t6;
      (e5._$AQ?.(o9),
        (e5._$AM = o9),
        void 0 !== e5._$AP && (t6 = o9._$AU) !== n8._$AU && e5._$AP(t6));
    }
    if (t5 !== d3 || c7) {
      let o10 = e5._$AA;
      for (; o10 !== t5; ) {
        const t6 = i5(o10).nextSibling;
        (i5(l5).insertBefore(o10, d3), (o10 = t6));
      }
    }
  }
  return e5;
};
var u4 = (o9, t5, i7 = o9) => (o9._$AI(t5, i7), o9);
var m2 = {};
var p3 = (o9, t5 = m2) => (o9._$AH = t5);
var M2 = (o9) => o9._$AH;
var h3 = (o9) => {
  (o9._$AR(), o9._$AA.remove());
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
var s6 = (i7, t5) => {
  const e5 = i7._$AN;
  if (void 0 === e5) return false;
  for (const i8 of e5) (i8._$AO?.(t5, false), s6(i8, t5));
  return true;
};
var o6 = (i7) => {
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
    (e5.add(i7), c5(t5));
  }
};
function h4(i7) {
  void 0 !== this._$AN
    ? (o6(this), (this._$AM = i7), r5(this))
    : (this._$AM = i7);
}
function n5(i7, t5 = false, e5 = 0) {
  const r6 = this._$AH,
    h5 = this._$AN;
  if (void 0 !== h5 && 0 !== h5.size)
    if (t5)
      if (Array.isArray(r6))
        for (let i8 = e5; i8 < r6.length; i8++) (s6(r6[i8], false), o6(r6[i8]));
      else null != r6 && (s6(r6, false), o6(r6));
    else s6(this, i7);
}
var c5 = (i7) => {
  i7.type == t4.CHILD && ((i7._$AP ??= n5), (i7._$AQ ??= h4));
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
      t5 && (s6(this, i7), o6(this)));
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
var o7 = /* @__PURE__ */ new WeakMap();
var n6 = e4(
  class extends f3 {
    render(i7) {
      return A;
    }
    update(i7, [s7]) {
      const e5 = s7 !== this.G;
      return (
        e5 && this.rt(void 0),
        (e5 || this.lt !== this.ct) &&
          ((this.G = s7),
          (this.ht = i7.options?.host),
          this.rt((this.ct = i7.element))),
        A
      );
    }
    rt(t5) {
      if (void 0 !== this.G)
        if ((this.isConnected || (t5 = void 0), "function" == typeof this.G)) {
          const i7 = this.ht ?? globalThis;
          let s7 = o7.get(i7);
          (void 0 === s7 &&
            ((s7 = /* @__PURE__ */ new WeakMap()), o7.set(i7, s7)),
            void 0 !== s7.get(this.G) && this.G.call(this.ht, void 0),
            s7.set(this.G, t5),
            void 0 !== t5 && this.G.call(this.ht, t5));
        } else this.G.value = t5;
    }
    get lt() {
      return "function" == typeof this.G
        ? o7.get(this.ht ?? globalThis)?.get(this.G)
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
var o8 = (o9) => o9 ?? A;

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/repeat.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var u5 = (e5, s7, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l5 = s7; l5 <= t5; l5++) r6.set(e5[l5], l5);
  return r6;
};
var c6 = e4(
  class extends i6 {
    constructor(e5) {
      if ((super(e5), e5.type !== t4.CHILD))
        throw Error("repeat() can only be used in text expressions");
    }
    dt(e5, s7, t5) {
      let r6;
      void 0 === t5 ? (t5 = s7) : void 0 !== s7 && (r6 = s7);
      const l5 = [],
        o9 = [];
      let i7 = 0;
      for (const s8 of e5)
        ((l5[i7] = r6 ? r6(s8, i7) : i7), (o9[i7] = t5(s8, i7)), i7++);
      return { values: o9, keys: l5 };
    }
    render(e5, s7, t5) {
      return this.dt(e5, s7, t5).values;
    }
    update(s7, [t5, r6, c7]) {
      const d3 = M2(s7),
        { values: p4, keys: a4 } = this.dt(t5, r6, c7);
      if (!Array.isArray(d3)) return ((this.ut = a4), p4);
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
        else if (h5[x2] === a4[k2]) ((v3[k2] = u4(d3[x2], p4[k2])), x2++, k2++);
        else if (h5[j2] === a4[w2]) ((v3[w2] = u4(d3[j2], p4[w2])), j2--, w2--);
        else if (h5[x2] === a4[w2])
          ((v3[w2] = u4(d3[x2], p4[w2])),
            v2(s7, v3[w2 + 1], d3[x2]),
            x2++,
            w2--);
        else if (h5[j2] === a4[k2])
          ((v3[k2] = u4(d3[j2], p4[k2])), v2(s7, d3[x2], d3[j2]), j2--, k2++);
        else if (
          (void 0 === m3 && ((m3 = u5(a4, k2, w2)), (y3 = u5(h5, x2, j2))),
          m3.has(h5[x2]))
        )
          if (m3.has(h5[j2])) {
            const e5 = y3.get(a4[k2]),
              t6 = void 0 !== e5 ? d3[e5] : null;
            if (null === t6) {
              const e6 = v2(s7, d3[x2]);
              (u4(e6, p4[k2]), (v3[k2] = e6));
            } else
              ((v3[k2] = u4(t6, p4[k2])), v2(s7, d3[x2], t6), (d3[e5] = null));
            k2++;
          } else (h3(d3[j2]), j2--);
        else (h3(d3[x2]), x2++);
      for (; k2 <= w2; ) {
        const e5 = v2(s7, v3[w2 + 1]);
        (u4(e5, p4[k2]), (v3[k2++] = e5));
      }
      for (; x2 <= j2; ) {
        const e5 = d3[x2++];
        null !== e5 && h3(e5);
      }
      return ((this.ut = a4), p3(s7, v3), E);
    }
  },
);

// node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/directives/live.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var l4 = e4(
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
      const o9 = i7.element,
        l5 = i7.name;
      if (i7.type === t4.PROPERTY) {
        if (t5 === o9[l5]) return E;
      } else if (i7.type === t4.BOOLEAN_ATTRIBUTE) {
        if (!!t5 === o9.hasAttribute(l5)) return E;
      } else if (i7.type === t4.ATTRIBUTE && o9.getAttribute(l5) === t5 + "")
        return E;
      return (p3(i7), t5);
    }
  },
);
export {
  i6 as Directive,
  i4 as LitElement,
  i as css,
  e4 as directive,
  b2 as html,
  o8 as ifDefined,
  l4 as live,
  A as nothing,
  n6 as ref,
  D as render,
  c6 as repeat,
  u3 as staticHtml,
  s4 as unsafeStatic,
};
