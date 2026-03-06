# Open Icons Playground

> A React-based design tool for exploring, testing, and governing a scalable icon system.

**Live Demo:** [open-icons-playground.vercel.app](https://open-icons-playground.vercel.app)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Goals of the Project](#goals-of-the-project)
- [Repository Structure](#repository-structure)
- [Icon System Philosophy](#icon-system-philosophy)
- [Icon Variant System](#icon-variant-system)
- [Encoding Design Knowledge](#encoding-design-knowledge)
- [Playground UI](#playground-ui)
- [Changelog Philosophy](#changelog-philosophy)
- [Example Change Entry](#example-change-entry)
- [AI Contribution Guidelines](#ai-contribution-guidelines)
- [Future Goals](#future-goals)
- [Contribution Guide](#contribution-guide)
- [License](#license)

---

## 🎯 Project Overview

**Open Icons Playground** is an interactive design tool built to:

- **Explore** an internal icon set with real-time previews
- **Test** icon variants (weights, styles, fills) across different contexts
- **Establish** clear usage rules and governance principles
- **Simplify** the icon library by identifying redundancy and consolidation opportunities
- **Embed** design knowledge directly into the system for humans and AI tools

This project serves:
- **Designers** — visual exploration and testing of icon consistency
- **Developers** — structured data and variant APIs
- **AI Design Tools** — machine-readable rules for icon selection and governance

---

## 🚀 Goals of the Project

The Open Icons Playground was created to solve key challenges in icon system management:

### Core Motivations

1. **Reduce Icon Redundancy**  
   Consolidate duplicate or overly similar icons to maintain a lean, focused library.

2. **Standardize Icon Usage**  
   Prevent misuse by documenting when and where specific icons should be used.

3. **Prevent Product-Specific Icon Misuse**  
   Clearly distinguish between generic icons (usable anywhere) and product-scoped icons (restricted to specific contexts).

4. **Create a Testbed for Variants**  
   Enable rapid prototyping of icon weights, fills, and styles to validate design decisions.

5. **Make Icon Governance Easier**  
   Provide a centralized system for tracking changes, deprecations, and design rationale.

### Key Questions This Tool Helps Answer

- **How can we simplify the icon set?**  
  Identify redundant icons and consolidation opportunities.

- **When should a generic icon vs product icon be used?**  
  Enforce scoping rules to prevent cross-product contamination.

- **How should designers override icons?**  
  Allow context-specific customization while maintaining system integrity.

- **How can company design knowledge be encoded into the system?**  
  Transform tribal knowledge into machine-readable rules.

---

## 📂 Repository Structure

```
open-icons-playground/
├── src/
│   ├── main.jsx                 # React app entry point
│   └── (icon components)        # SVG path logic, variant rendering
├── index.html                    # HTML shell
├── vite.config.js                # Vite build configuration
├── package.json                  # Dependencies
├── data/
│   ├── icons.json                # Icon metadata (future)
│   └── icon-rules.json           # Usage rules (future)
├── docs/
│   ├── changelog.md              # Design change log
│   └── design-principles.md      # Icon philosophy
└── README.md                     # This file
```

### Folder Responsibilities

| Folder | Purpose |
|--------|--------|
| `src/` | Core React components and icon rendering logic |
| `data/` | Structured icon metadata and governance rules (planned) |
| `docs/` | Design rationale, changelogs, and contribution guides |

---

## 🎨 Icon System Philosophy

The Open Icons system is built on clear, enforceable principles:

### Core Principles

1. **Icons Should Be Generic by Default**  
   Base icons represent universal concepts (e.g., `search`, `close`, `add`) and can be used across any product.

2. **Product Icons Must Be Scoped**  
   Icons tied to specific products (e.g., `analytics-dashboard-icon`) cannot be repurposed generically.

3. **Visual Consistency is Required**  
   Icons must align with stroke weight, corner radius, and endpoint styles defined in the system.

4. **Duplicate Icons Should Be Consolidated**  
   Multiple icons serving the same purpose create confusion and bloat.

### Icon Classification

| Type | Definition | Example |
|------|------------|--------|
| **Generic** | Universal, reusable across all contexts | `document`, `share`, `close` |
| **Product** | Scoped to a specific product or feature | `analytics-chart`, `crm-contact` |
| **Custom** | Context-specific overrides of generic icons | `search-advanced` (replaces `search` in specific UI) |
| **Deprecated** | Marked for removal, should not be used | `old-arrow-left` → use `arrow-left` |

---

## 🔀 Icon Variant System

The playground supports multiple visual variants per icon to enable flexible design:

### Supported Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Default** | Base icon, generic usage | Standard UI elements |
| **Outlined** | Stroke-only, no fill | Minimal, light themes |
| **Filled** | Solid fill, no stroke | Bold, emphasis states |
| **Brand** | Company-specific styling | Marketing, branded contexts |
| **Custom** | Context-specific override | Product-specific adaptations |

### Override Philosophy

The system allows **custom icons** to replace **default icons** in specific product contexts:

```json
{
  "search": {
    "default": "generic-search.svg",
    "custom": {
      "product-x": "advanced-search.svg"
    }
  }
}
```

This approach maintains **flexibility** (products can adapt icons when needed) while **preventing misuse** (custom icons don't leak into other products).

---

## 🧠 Encoding Design Knowledge

One of the project's core goals is to transform **tribal design knowledge** into **machine-readable rules** that AI tools can understand.

### Why Encode Rules?

Without structured rules:
- Designers repeat the same questions
- AI tools make incorrect icon suggestions
- Inconsistencies creep into products over time

### Example Rule Structure

**File:** `data/icon-rules.json`

```json
{
  "search": {
    "allowed_contexts": [
      "global-search",
      "navigation-bar",
      "toolbar"
    ],
    "disallowed_contexts": [
      "product-specific-filters"
    ],
    "rationale": "Search icon represents universal search. Product-specific search should use custom variants."
  },
  "analytics-chart": {
    "scope": "product-only",
    "product": "analytics-dashboard",
    "rationale": "This icon is specific to the Analytics product and should not be used generically."
  }
}
```

### Benefits

✅ **AI tools** can avoid suggesting incorrect icons  
✅ **Designers** get instant feedback on icon usage  
✅ **Documentation** stays synchronized with the system

---

## 🖼️ Playground UI

The playground interface provides real-time visual testing:

### Key Features

- **Icon Browsing** — Grid view of all icons with search/filter
- **Variant Preview** — Live comparison of weights, fills, and styles
- **Override Testing** — Simulate product-specific icon replacements
- **Relationship Exploration** — Visualize which icons are related or redundant
- **Deprecation Review** — Highlight icons marked for removal

### How Designers Use It

1. **Evaluate simplification opportunities** — Are two icons too similar?
2. **Test variant consistency** — Do all icons look cohesive at different weights?
3. **Validate new icons** — Does a proposed icon fit the system?
4. **Document decisions** — Add rationale directly in the tool

---

## 📖 Changelog Philosophy

Traditional changelogs list technical changes. This project uses **Design Change Logs** to document **why** decisions were made.

### What's Different?

Each change entry includes:

| Field | Purpose |
|-------|--------|
| **Problem** | What design issue existed? |
| **Decision** | How was it solved? |
| **Before / After** | Visual comparison |
| **Impact** | How does this affect designers? |

### Why This Matters

- **Humans** understand the reasoning, not just the result
- **AI tools** can learn from past decisions
- **Design blog posts** can be generated automatically

---

## 📝 Example Change Entry

### ✅ Simplified Navigation Icons

**Problem:**  
Too many arrow variants existed (`arrow-left`, `chevron-left`, `caret-left`, `back-arrow`), causing confusion about which to use.

**Decision:**  
Consolidated into **three directional arrows**:
- `arrow-left` / `arrow-right` — Navigation actions
- `chevron-right` — Expanding/collapsing menus
- `arrow-up` / `arrow-down` — Vertical movement

**Before:**
- 12 arrow-like icons with unclear distinctions

**After:**
- 5 clear, purposeful arrows

**Impact:**  
Reduces ambiguity and simplifies design decisions. Designers no longer need to guess which arrow to use.

**Deprecations:**
- ~~`caret-left`~~ → use `chevron-right`
- ~~`back-arrow`~~ → use `arrow-left`

---

## 🤖 AI Contribution Guidelines

AI assistants (like Claude, GPT, or design copilots) are encouraged to contribute, following these guidelines:

### What AI Should Do

✅ **Propose icon simplifications** — Flag redundant or overly similar icons  
✅ **Identify duplicates** — Suggest consolidation opportunities  
✅ **Recommend clearer naming** — Improve icon discoverability  
✅ **Update rules** — Suggest new governance rules based on usage patterns  
✅ **Document rationale** — Explain why a change improves the system

### What AI Should NOT Do

❌ **Delete icons without deprecation steps** — Always mark for deprecation first  
❌ **Introduce product-specific icons as generic** — Respect scoping rules  
❌ **Bypass governance rules** — Changes must align with icon philosophy  
❌ **Make breaking changes without impact analysis** — Consider downstream effects

### How AI Should Treat This Repository

This is a **design knowledge base**, not just code:
- Rules should be learned and applied
- Past decisions inform future suggestions
- Governance principles take priority over personal preference

---

## 🔮 Future Goals

### Short-Term
- [ ] Add `data/icons.json` with full icon metadata
- [ ] Implement icon search and filtering in UI
- [ ] Create `data/icon-rules.json` with initial governance rules

### Medium-Term
- [ ] **Automated icon linting** — Flag rule violations in CI/CD
- [ ] **Figma plugin integration** — Sync icons between Figma and code
- [ ] **AI-assisted icon selection** — Suggest the right icon based on context

### Long-Term
- [ ] **Design rule enforcement** — Prevent incorrect icon usage at compile time
- [ ] **Visual regression testing** — Ensure icons remain pixel-perfect across updates
- [ ] **Cross-platform icon generation** — Export to iOS, Android, Web

---

## 🤝 Contribution Guide

We welcome contributions that improve the icon system. Follow these steps:

### How to Contribute

1. **Identify a Problem**  
   What design issue exists? (e.g., "Too many similar search icons")

2. **Propose a Solution**  
   How should it be fixed? (e.g., "Consolidate into one search icon with variants")

3. **Document Reasoning**  
   Why is this better? What's the design rationale?

4. **Update Icon Rules** (if applicable)  
   Add or modify `data/icon-rules.json` to reflect the change.

5. **Add Changelog Entry**  
   Document the change in `docs/changelog.md` using the format above.

6. **Open a Pull Request**  
   Include before/after visuals and impact analysis.

### Review Criteria

Contributions are evaluated based on:
- Alignment with icon system philosophy
- Clarity of design rationale
- Impact on existing designs
- AI/human readability of documentation

---

## 📜 License

MIT License — Free to use, modify, and distribute.

See [LICENSE](./LICENSE) for full details.

---

## 🙌 Acknowledgments

Built with:
- [React](https://react.dev) — UI framework
- [Vite](https://vitejs.dev) — Build tool
- [Vercel](https://vercel.com) — Deployment platform

Inspired by design systems from Google Material, Apple SF Symbols, and Figma Icons.

---

**Questions?** Open an issue or start a discussion. This project thrives on thoughtful design contributions. 🎨
