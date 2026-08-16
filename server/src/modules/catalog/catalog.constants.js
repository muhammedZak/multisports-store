export const SPORT_OPTIONS = Object.freeze([
  { value: 'football', label: 'Football' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'running', label: 'Running' },
  { value: 'fitness', label: 'Fitness' },
]);

export const SPORT_VALUES = Object.freeze(
  SPORT_OPTIONS.map((sport) => sport.value),
);

export function isSupportedSport(value) {
  return SPORT_VALUES.includes(value);
}
