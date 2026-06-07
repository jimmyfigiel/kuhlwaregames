# Five Parsecs Procedure Engine v1.42

This is a syntax fix for v1.41.

## Fixed error

```text
[PARSE_ERROR] Unexpected token
src/games/five-parsecs-procedure/factory/FiveParsecsCommandFactory.js:151:2
```

## Cause

The automated v1.41 build left the tail of the old `makeEquipmentRecord()` function after the new richer version. That created a stray:

```js
}) {
```

in the factory file.

## Changed file

```text
src/games/five-parsecs-procedure/factory/FiveParsecsCommandFactory.js
```

No behavior was intentionally changed from v1.41; this only repairs the malformed factory file.
