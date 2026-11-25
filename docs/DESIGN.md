## Overview
A calm, dignified mosque information board for a 16:9 TV screen. Dark emerald green with soft gold accents and warm white text. Islamic geometric pattern used subtly, never loud. Everything must stay readable from several meters away. All interface text in Bahasa Indonesia.

## Colors
- **Primary deep green** (#051F16): main background
- **Green surface** (#082A1E): cards and panels
- **Green raised** (#0E3B2C): highlighted rows and inner panels
- **Gold** (#C9A962): borders, ornaments, key accents, countdown frame
- **Gold soft** (#E3CD96): bright text on dark green, highlighted values
- **On-gold text** (#051F16): text on filled gold bars in dark themes; warm white (#F7F1E3) on the dark gold (#75591F) in the light theme
- **Warm white** (#F7F1E3): main text
- **Warm dim** (#CFC7AE): secondary text, labels, iqomah notes
- **Night blue variant** (#0A1628 background, same gold): alternate default theme

## Typography
- **Display font**: Cormorant Garamond (serif, semi-bold) for the mosque name and the countdown prayer name
- **Body font**: Plus Jakarta Sans (regular and semi-bold) for schedules, finance, labels, and ticker
- **Numbers**: tabular figures for all times and countdowns, always the largest element in the countdown card

## Elevation
No drop shadows. Depth comes from border contrast, subtle gold hairlines, and surface color steps. Cards use a 1px gold-tinted border and rounded corners near 12px.

## Components
- **Header**: mosque name in gold serif capitals centered, small gold ornament divider under it, address below, big clock at the right, three small status pills at the left
- **Prayer schedule**: rows with prayer name, iqomah note, and time; the next prayer row is the brightest row on the list with a gold border; a small WIB label sits at the right of the schedule header
- **Countdown card**: double concentric mihrab arch frame in gold around the next prayer name and the ticking countdown; a thin gold progress bar at its base
- **Finance panel**: rows per category with amounts, a filled gold Total Saldo bar with dark text on dark themes and warm white text on the light theme, QRIS boxes show a dashed placeholder with a QRIS label when not configured; a small Transparansi label sits at the right of the Info Masjid header
- **Mini cards**: event countdown and murotal status below the countdown card, filled with real content, no large empty space
- **Ticker**: one line at the bottom with a gold PENGUMUMAN label, rotating messages in place
- **Status pills**: MODE, MUROTAL, and connection state, three pills only

## Do's and Don'ts
- Do keep 4.5 to 1 contrast for normal text on every theme, including the light theme
- Do show "Rp —" when a cash amount is empty and leave QRIS empty when it is not configured
- Don't invent cash amounts, QRIS codes, prayer times, testimonials, or statistics
- Don't use mock data as real data
- Don't crowd the screen; every card must be filled with real content or honest empty states
- Don't use bright pure white text on gold fills
- Do keep the 3-column layout: schedule left, countdown center, finance right
