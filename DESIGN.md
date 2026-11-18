---
name: Skew
description: A light measured sheet. Poppins, hairline panels, pill controls, and a three-part bias bar.
colors:
  ink: "#00000f"
  muted: "#68728d"
  surface: "#f6f6f6"
  panel: "#ffffff"
  panel-muted: "#f0f0f0"
  line: "#e5e7eb"
  bias-left: "#b42318"
  bias-center: "#e5e7eb"
  bias-right: "#1d4ed8"
  footer-muted: "#c8cdd8"
  diagram: "#e4e4f6"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  news-mark:
    fontFamily: "Poppins, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  card-title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  subheading:
    fontFamily: "Poppins, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  body-large:
    fontFamily: "Poppins, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Poppins, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Poppins, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Poppins, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  "4": "4px"
  "8": "8px"
  "16": "16px"
  "24": "24px"
  "32": "32px"
  "40": "40px"
  "64": "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  button-primary-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 4px"
    height: "28px"
  button-text-hover:
    backgroundColor: "transparent"
    textColor: "{colors.bias-right}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 4px"
    height: "28px"
  button-disabled:
    backgroundColor: "{colors.panel-muted}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  wordmark:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
---

# Design System: Skew

## Overview

**Creative North Star: "The Measured Sheet"**

Skew reads as a measured sheet. Poppins is the only typeface. The ground is sheet gray, panels are white, corners on those panels are 12px, and a 1px hairline separates a panel from the ground. Near-black ink does the reading and fills the primary button. Muted slate carries supporting text.

The strong color sits in the bias bar. The left share is red, the center share is the hairline gray, and the right share is blue. That blue is also the focus ring, the text-selection color, and the text-button hover. Buttons, chips, and the meter are pills. Panels sit flat. A small, medium, and large shadow scale is part of the system, and the sheet uses the small shadow on the round info pip over the card photograph.

The wordmark is Skew, set extrabold, with a smaller News mark in medium weight on the same baseline. The lockup carries the line “Balanced news coverage, powered by AI.” The ink footer repeats the lockup in white and footer gray and closes with “Stay consistent. Stay unbiased.”

**Key Characteristics:**

- Poppins only, at weights 400, 500, 600, 700, and 800
- Sheet gray ground, white panels, a 1px hairline, and 12px panel corners
- Near-black ink for reading text and the filled button
- Full pills for buttons, chips, and the bias meter
- Bias bar in left red, center hairline, and right blue
- Flat panels, with a three-step shadow scale beside them

## Colors

The sheet is cool gray and near-black, with red and blue reserved for the bias bar and for blue’s small interactive roles.

### Primary

- **Near-Black Ink** (#00000f): Primary text, the filled primary button, and the footer ground. The wordmark uses it on the gray sheet and switches to white on the footer.

### Secondary

- **Slate Mute** (#68728d): Supporting text. The sheet labels this text secondary. It is the tagline, the type-specimen notes, the card deck, captions, and the News mark on a light ground.

### Neutral

- **Sheet Gray** (#f6f6f6): The page ground behind every panel.
- **Panel White** (#ffffff): Panel fill, the secondary button, the chip, and the label color on the filled button and on the red and blue meter segments.
- **Pressed Gray** (#f0f0f0): The secondary button’s hover fill and the shared disabled fill. The sheet labels this background secondary.
- **Hairline** (#e5e7eb): The 1px panel border, the divider, the secondary button border, and the center share of the bias meter. Center and border are the same value.
- **Footer Gray** (#c8cdd8): Text on the ink footer, including the inverse News mark.
- **Diagram Lavender** (#e4e4f6): The spacing bars and the twelve-column diagram only.

### Named Rules

**The Bias Bar Rule.** The meter is three shares. Left is Bias Red (#b42318) with white labels. Center is the hairline (#e5e7eb) with ink labels. Right is Bias Blue (#1d4ed8) with white labels. Bias blue is also the 2px focus ring, the text-selection background, and the text-button hover. Bias red stays on the left share.

**The Ink Fill Rule.** The filled primary control is near-black ink with white type. Slate mute is for support, not for the primary action.

## Typography

**Display Font:** Poppins (with sans-serif)
**Body Font:** Poppins (with sans-serif)

**Character:** One geometric sans does every job. The wordmark is the heaviest and tightest setting. Reading text stays regular. Controls are medium at 13px.

### Hierarchy

- **Display** (800, 40px, line-height 1, tracking -0.03em): The wordmark “Skew” on the brand lockup. The footer lockup uses the same weight at 22px.
- **News mark** (500, 14px, line-height 1): The smaller “News” beside Skew, aligned to the baseline with a 6px gap and a 7px bottom offset. The footer mark is 11px with a 3px offset.
- **Headline** (700, 32px, line-height 1.2): Page and screen titles. The type specimen’s “Poppins” line uses this step.
- **Title** (600, 24px, line-height 1.3): Section titles on the published scale.
- **Card title** (600, 20px, line-height 1.3): The article card headline.
- **Subheading** (500, 16px, line-height 1.4): Subheads on the published scale.
- **Body large** (400, 16px, line-height 1.6): Important reading copy.
- **Body** (400, 14px, line-height 1.6): Default reading copy, including the lockup tagline.
- **Body small** (400, 13px, line-height 1.6): Supporting sentences, including the card deck. The footer tagline uses 13px at line-height 1.4.
- **Label** (500, 13px, line-height 1): Button and chip text.
- **Caption** (400, 11px, line-height 1.4): Category lines, timestamps, swatch captions, and the meter’s 0–100 scale.

### Named Rules

**The Poppins Rule.** Poppins is the only typeface. The loaded weights are 400, 500, 600, 700, and 800. There is no second family and no monospace role.

**The Wordmark Rule.** Skew is 40px extrabold, tracking -0.03em, line-height 1. News is 14px medium on the same baseline, 6px away, dropped 7px so the two marks align. On the ink footer, Skew is 22px and News is 11px, dropped 3px, in footer gray.

## Layout

The spacing rhythm is a 4px base. The published steps are 4, 8, 16, 24, 32, 40, and 64. Diagrams of that scale are lavender bars.

The container is 1280px, centered. The published grid is 12 columns, a 24px gutter, and a 24px margin. On the sheet, side padding is 16px and becomes 24px from 640px up. Vertical padding is 24px. Panels are separated by 16px and stack in one column below 1200px.

At 720px the type specimen switches from a stacked list to a table, and the article card places its 132×108 photograph beside the text. Below that width the photograph is full width and 168px tall. The footer becomes a horizontal row at 900px. The column diagram becomes a row at 700px.

**The 1280 Rule.** Content lives in a 1280px container. The grid to follow is 12 columns with a 24px gutter and a 24px margin.

## Elevation & Depth

Panels are flat. Depth on a resting panel is the hairline border against the sheet gray ground. The system still publishes three shadows, and the only shadow in the live sheet is the small one, under the 20px info pip on the card photograph.

The focus ring is a 2px solid bias-blue outline, offset 2px. It is the global focus-visible treatment. Text selection uses bias blue with white type. The color scheme is light.

### Shadow Vocabulary

- **Small** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`): The photo info pip. Also the first step of the shadow specimen.
- **Medium** (`box-shadow: 0 4px 12px rgb(0 0 0 / 0.08)`): The middle step of the shadow scale.
- **Large** (`box-shadow: 0 12px 24px rgb(0 0 0 / 0.12)`): The largest step of the shadow scale.

### Named Rules

**The Flat Panel Rule.** A panel at rest is white, 12px, and 1px hairline, with no shadow. Do not promote the medium or large shadow onto resting panels. The article card itself is flat.

## Shapes

Controls are pills. Panels, the footer, and the card photograph use the large corner. Small specimens use the medium corner. Scale diagrams clip only the top corners with the small radius.

- **Small** (4px): Top corners of the spacing bars and the twelve column bars.
- **Medium** (8px): Color swatches and the shadow and radius specimen tiles.
- **Large** (12px): Panels, the footer, and the card photograph.
- **Full** (9999px): Buttons, chips, the bias meter, and the info pip.

### Named Rules

**The Pill Control Rule.** Buttons, chips, and the bias meter are full pills. Panels and photographs use 12px. The two radii do not swap.

## Components

### Buttons

Short pills, 28px tall, 13px medium, line-height 1. Primary and secondary use 10px of horizontal padding. Text uses 4px. The border is 1px.

- **Shape:** Full pill (9999px).
- **Primary:** Ink fill, white type, transparent border. The hover state is the same fill and type.
- **Primary outline:** White fill, ink type, ink border. Hover does not change it.
- **Secondary:** White fill, ink type, hairline border. Hover fills with pressed gray. The secondary outline matches the secondary default, because both use the hairline.
- **Text:** Transparent, ink type, no visible border. Hover turns the type bias blue. The sheet does not show a text outline or a text disabled cell.
- **Disabled:** Any disabled variant, including text, is pressed gray with slate type and a transparent border.
- **Focus:** 2px bias-blue outline, 2px offset.

### Chips

- **Style:** A 28px pill with a hairline border, white fill, ink type, and 10px horizontal padding. The label is 13px medium. A 12px plus mark sits 4px after the label.
- **State:** The shipped chip has no separate hover, selected, or disabled treatment.

### Cards / Containers

- **Corner Style:** The surrounding panel is 12px. The photograph inside the article card is 12px.
- **Background:** Panel white. The article card adds no second surface.
- **Shadow Strategy:** The card is flat. The info pip on the photograph is a 20px white pill with the small shadow.
- **Border:** The panel’s 1px hairline. The card has no border of its own.
- **Internal Padding:** The panel padding is 20px. Card text stacks with 4px under the category line, 8px under the title, and 12px under the deck.
- **Article card type:** Category line in caption, muted. Title at the card-title step. Deck in body small, muted. Meta is caption, muted, with the time and the read length 16px apart.
- **Photograph:** 132×108 beside the text from 720px up. Full width and 168px tall below that.

### Bias meter

The signature component. A full pill split into three flex segments whose widths follow the left, center, and right percentages. Labels read “Left 25%”, “Center 50%”, and “Right 25%” on the reference meter. Segment labels do not wrap. Each segment has 4px of horizontal padding.

- **System size:** 32px tall, 12px medium labels, with an 11px muted scale under it reading 0%, 50%, and 100%, 6px below the bar.
- **Card size:** 24px tall, 10px medium labels, no scale.
- **Colors:** Left red with white type, center hairline with ink type, right blue with white type.

### Wordmark

Skew plus News, items aligned to the end. Brand size is the display step plus the 14px News mark. Footer size is 22px extrabold and 11px medium. Default tone is ink and slate. Inverse tone, used on the ink footer, is white and footer gray.

### Panels

White, 12px, 1px hairline, 20px padding. The sheet groups the brand lockup, the type scale, the controls, the color swatches, the article specimen, and the spacing, grid, shadow, and radius specimens in these panels.

### Footer

Ink ground, 12px corners, 24px horizontal padding, 20px vertical padding, footer-gray type. It holds the inverse wordmark, the tagline, and the closing line “Stay consistent. Stay unbiased.”

### Named Rules

**The Shared Disabled Rule.** Disabled buttons share one treatment: pressed gray fill, slate type, transparent border. Variant and outline do not survive the disabled state.

## Do's and Don'ts

### Do:

- **Do** set the page on sheet gray (#f6f6f6) with near-black ink (#00000f) in Poppins.
- **Do** keep panels white, with a 12px corner, a 1px #e5e7eb border, and no resting shadow.
- **Do** use the full pill radius (9999px) for buttons, chips, and the bias meter.
- **Do** draw the bias meter as left red, center hairline, and right blue. The reference split on the sheet is 25 / 50 / 25.
- **Do** set the wordmark as Skew in extrabold with the smaller News mark on the baseline.

### Don't:

- **Don't** add a second typeface, a monospace role, or a dark color scheme.
- **Don't** place the small, medium, or large shadow on a resting panel.
- **Don't** use the left bias red for button fills or page backgrounds.
- **Don't** split the center share off the hairline. Both are #e5e7eb.
