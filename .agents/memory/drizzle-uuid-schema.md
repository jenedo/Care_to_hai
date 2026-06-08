---
name: Drizzle UUID schema bug
description: text().default("gen_random_uuid()") stores literal string not UUID; correct pattern documented.
---

## The bug
`text("id").primaryKey().default("gen_random_uuid()")` in Drizzle schema sets a JavaScript-level string default.
Every row gets the literal string `"gen_random_uuid()"` as its id. Second insert = duplicate PK.

## The fix
```ts
import { randomUUID } from "node:crypto";
text("id").primaryKey().$defaultFn(() => randomUUID())
```

`$defaultFn` runs in JavaScript before the INSERT, so each row gets a real UUID.
This does NOT require a DB migration (column type stays `text`).

**Why:** Drizzle's `.default(value)` passes `value` as a literal to the DB or uses it as a JS default — it does NOT call `gen_random_uuid()` as a SQL function. For SQL-function defaults use `sql\`gen_random_uuid()\``. For JS-side generation use `.$defaultFn(() => randomUUID())`.

**How to apply:** Every table with `text("id").primaryKey()` in lib/db/src/schema/ must use `.$defaultFn(() => randomUUID())`.
