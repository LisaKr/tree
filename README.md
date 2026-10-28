# Kinfolk Family Archive

A local-first, connected family-tree viewer built with React, React Flow and Dagre.

## Website

Published at https://lisakr.github.io/tree/. GitHub Actions tests, builds, and deploys the site on every push to `main`. Enable GitHub Pages with **GitHub Actions** as the source in the repository's Pages settings.

The website and its bundled family data are public. Browser edits remain local to each visitor until exported; they do not update the published website automatically.

## Run

```sh
npm install
npm run dev
```

Open the URL Vite prints. `npm run build` makes a production build; `npm test` checks the data and relationship model.

## Your Archive

The initial archive contains all 100 supplied people and 43 family records after consolidating duplicate single-parent records with the confirmed couples. **Musya and Sima are daughters of Irma and Sonya**; Irma and Rebecca's son Leonid (Lyolya) remains in their separate family. Musya and Moisey are parents of Leonid Moiseyevych and Sofiya. Musya is the creator's great-grandmother, not merely a relative through a partnership.

All people are always in one tree. Partners share generation rows, and recorded children are grouped in birth order where dates are available. Children descend from the junction in the line between their two parents. Irma's two marriages have separate junctions and child connectors. Records without a known second parent retain their single-parent connectors. Selecting a person highlights their recorded family; clicking empty space or Fit all restores full contrast.

Separate ancestral branches have wider gaps than groups within a branch. The creator's recorded ancestor line gets placement priority so parents stay nearby rather than being pushed away by distant families. Spacing is calculated per generation, and only non-overlapping family connectors can share a routing level. The layout does not rearrange itself when selecting another person.

Search locates a person without filtering the canvas. Results show known dates and parents; search can match those fields too. Back and Forward follow visited people. Return to me locates the export's `isCreator` person at reading zoom. Files without a creator use a neutral Home person button and do not assume a reference identity for relationship labels.

Fit all shows the entire tree with names-only cards. Clicking the zoom percentage restores 100% reading zoom, dates, relationship labels, and note icons. The overview map supports panning and zooming and outlines the visible viewport. Card dimensions stay fixed across zoom modes. The toolbar omits the former marker and book buttons, and the canvas has no complete-tree text overlay.

## Languages

The header switches between English and Ukrainian (EN / УК on smaller screens), remembering the choice on this device. All 100 supplied names, birth names, recorded birthplaces, notes, relationship labels, and interface controls have Ukrainian versions. Searching accepts either language, and switching does not move the tree or change family connections.

Ukrainian relationship labels use familiar family roles for spouses: an uncle's female partner is "Тітка", a grandfather's female partner is "Бабуся", and the same rule applies within longer relationship paths. Recorded gender takes precedence; when it is absent, the opposite role is used where the existing role supplies one, otherwise the wording stays neutral. This presentation convention does not add biological parentage or alter the original English labels.

Original English records remain unchanged by switching languages. Editing Ukrainian names, places, or notes saves separate `translations.uk` fields, included in JSON exports and restored on import. Dates remain shared. Newly added or changed English notes and unfamiliar imported names are preserved as entered rather than sent to a translation service; their Ukrainian versions can be entered in the Ukrainian editor. The supplied historical notes have curated translations.

Hover or keyboard-focus a card for a note preview. Its note button opens the full, selectable text in a persistent reader with Copy and Edit actions. The details panel also has Read full note, including on mobile. Long notes scroll inside the reader.

Relationship labels use explicit parent-child links and known genders only. Missing gender uses neutral terms. Labels show a nearest recorded relationship, not every possible connection. Connections through partnerships are described specifically, such as "First cousin's wife" or "Spouse's father," with marital status respected. Long labels have a two-line card preview, a full tooltip, and unrestricted text in the details panel. A disconnected record still says "No recorded relationship" because a connection cannot be invented. Birth order cannot be guaranteed when imported families impose contradictory sibling-order constraints; unusual relationships that make partner grouping cyclic fall back to an individual-node layout without changing data.

Edits are saved in this browser's local storage. Export JSON to keep a portable backup, including notes, contacts, IDs, and relationship records. Import replaces the current browser archive after validation, so export any edits you want to keep first. For this archive, loading saved data or importing applies the confirmed parentage corrections: single-parent children join an existing couple when exactly one couple is recorded, with the explicit Sonya assignment for Irma. Notes and person edits are preserved. Other archives are not automatically given additional relationships, and ambiguous partnerships are not guessed.

There is no backend, analytics, or external font request. Data stays in your browser, but this is not authentication or encryption: anyone who can access the running app can view the bundled initial archive. Do not publicly deploy this personal dataset without the family's consent. Photo data URIs are supported; remote photo URLs are preserved in exports but not fetched, to avoid sending visitor information to external hosts.