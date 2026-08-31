# Human-site locales

The DAT website exposes 24 locale prefixes: `en`, `ko`, `ja`, `zh`, `de`, `fr`, `es`, `pt`, `ru`, `ar`, `hi`, `bn`, `ur`, `id`, `fa`, `mr`, `vi`, `te`, `ha`, `tr`, `sw`, `ta`, `th`, and `it`.

The language selector searches both locale codes and displayed language names. Matching is case-insensitive, ignores combining marks, and supports Korean initial-consonant queries. Arrow keys move through results, Enter selects the active result, and Escape closes the selector.

The selector list and search field span the full menu width without horizontal inset. The search field remains transparent in its default, hover, focus, active, and text-selection states.

Korean is the human-documentation source. Existing translated locale pages retain their translations. Persian, Marathi, Vietnamese, Telugu, Hausa, Turkish, Swahili, Tamil, Thai, and Italian provide native translations for the seven core pages and complete UI dictionaries. Shared library, service, and tool routes use the English-reference fallback where locale-specific pages are unavailable.

`id` is displayed as `Indonesia` in the selector.
