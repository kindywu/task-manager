# CLAUDE.md


## Commands
bun install
bun run build

## Mermaid Diagram Rules

All Mermaid diagrams in this project must follow these rules — no exceptions.

### Language
- All text inside diagrams must be in **English only**
- No Chinese or any other non-ASCII language inside diagram syntax

### Forbidden Syntax
- No HTML entities: `&lt;` `&gt;` `&amp;` — use plain text instead
- No HTML tags: `<br/>` — use a single line or split into separate nodes
- No special characters in labels: `§` `()` `<>` `{}` — simplify or remove
- No parentheses in arrow labels: `-->|invoke()|` → use `-->|invoke|`

### Safe Patterns
- `subgraph` titles: plain English words only, quotes are fine
- Node labels: plain text, no markup
- Arrow labels: short English phrases, no punctuation
- `alt/else` branches in sequenceDiagram: English only
- `Note over`: English only

### Examples

Bad:
```mermaid
sequenceDiagram
    participant OS as 操作系统
    STORE->>LIB: invoke('has_pin')
    Note over REACT,WV: 用户输入正确 PIN 后
```

Good:
```mermaid
sequenceDiagram
    participant OS as OperatingSystem
    STORE->>LIB: invoke has_pin
    Note over REACT,WV: User enters correct PIN
```