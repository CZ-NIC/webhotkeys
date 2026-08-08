# 0.9.6 (2026-08-08)
Fix: a hotkey group named "constructor" (or any other name colliding with an inherited Object property, e.g. "__proto__") crashed or corrupted the internal group registry. `_hotkeys`/`_groups` now use `Object.create(null)`.

# 0.9.5 (2026-07-19)
Fix: disabling an already disabled hotkey spliced the last foreign hotkey sharing the combination out of the registry.

# 0.9.4 (2025-05-27)
License set to LGPL.
