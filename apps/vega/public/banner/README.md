# Banner texture atlas

`patterns.webp` is copied byte-for-byte from `archive/apps/vesper/public/banner.webp`, already used by the former HeliCraft banner editor. The active app serves its own copy and has no archive runtime dependency. It is a Minecraft banner texture sprite sheet, not generated SVG approximations.

The atlas is 946×714 pixels: 43 columns, 17 rows, each 20×40-pixel cell followed by a 2-pixel gap. Column 0 is the base and columns 1–42 are named patterns; the mapping lives in `src/states/banner-model.ts`. Row 0 contains the uncolored source; rows 1–16 are the dye colors in the atlas order. The preview selects the actual precolored cell, preserving texture shading and alpha, rather than replacing it with a flat path or gradient. Horizontal rendering rotates the composed 20×40 banner to 40×20 without stretching.
