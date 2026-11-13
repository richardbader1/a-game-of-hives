A Game of Hives - Dice Effects Sprite Asset Pack

Copy all PNG files to your existing project's public/assets/dice-effects/ directory,
or adjust to the assets convention found by Codex. Do not assume the directory
exists before checking the repository.

SHEET METADATA
varroa_mite_scurrying_sprite_sheet.png
  image: 1536 x 1024 pixels; 3 columns x 2 rows; 6 frames; 512 x 512 each
  reading order: row-major, left-to-right, top-to-bottom
pesticide_sprayer_walk_spritesheet.png
  image: 1404 x 268 pixels; 6 columns x 1 row; 6 frames; 234 x 268 each
pesticide_sprayer_spray_spritesheet.png
  image: 1404 x 272 pixels; 6 columns x 1 row; 6 frames; 234 x 272 each
thermometer_stable_12frame_spritesheet.png
  image: 840 x 1215 pixels; 4 columns x 3 rows; 12 frames; 210 x 405 each
  reading order: row-major, left-to-right, top-to-bottom

All supplied images have RGBA alpha channels. Use source PNGs without re-encoding
or resizing the full sprite sheets; scale rendered frames on-screen instead.

IMPORTANT
- The walk and spray sprite sheets have slightly different heights; align by
  feet/bottom baseline when switching between sequences.
- Thermometer should remain stationary while advancing sprite frames.
- Rain, wind, visual heat shimmer, pesticide mist, and confetti should be
  implemented as procedural overlay effects, not extracted from these files.
- Adjust animation timing after visual QA.
