#!/bin/bash

# Force a UTF-8 locale for Chromium/GTK dialogs when host locale is incomplete.
if [[ -z "${LANG:-}" || "${LANG}" != *"UTF-8" && "${LANG}" != *"utf8" ]]; then
	export LANG=C.UTF-8
fi

if [[ -z "${LC_ALL:-}" ]]; then
	export LC_ALL="$LANG"
fi

export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"
exec zypak-wrapper /app/lib/whatsnux/whatsnux "$@"
