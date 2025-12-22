/**
 * constants.js
 * Static configuration, lookup tables, and color palettes for the visualization
 */

// Shared helpers and state for the map and charts
export const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Used to label states on hover for the basemap
export const STATE_ABBREV = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
};

// Carrier name aliases for cleaner display
export const CARRIER_ALIASES = {
  'ExpressJet Airlines LLC d/b/a aha!': 'ExpressJet (aha!)',
};

// Resolve CSS custom properties so colors can be in sync with styles.css
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Map color palette (resolve at render time so dev/prod stay in sync)
export const getMapColors = () => ({
  land: cssVar('--land') || '#E3ECF6',
  border: cssVar('--border-strong') || '#C2D1E5',
  state: cssVar('--border-strong') || '#C2D1E5',
  hub: cssVar('--ink') || '#111827',
  node: cssVar('--accent2') || '#5471a9',
  route: cssVar('--route') || '#4B6EDC',
  highlight: cssVar('--accent1') || '#F97316',
});

// Colorblind-friendly palette with 22 distinct colors (cool/neutral, on-theme)
export const MARKET_COLORS = [
  '#1F4B99', '#4E6FB8', '#7896CE', '#AFC2E6', '#C7D6ED', // blues
  '#0F6A6A', '#2F8F8F', '#5BA9A9', '#8CC6C6', '#B7E0DF', // teals
  '#3A6E3A', '#5F915F', '#8AB78A', '#B7D8B7', '#D9EBD9', // greens
  '#6B5FA5', '#8A7BC1', '#A897DD', '#C3B3F0', '#DDD3FF', // violets
  '#586F7C', '#7A8E9A' // neutrals
];
