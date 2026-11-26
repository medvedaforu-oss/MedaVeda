export const SPACING = {
  xs: 5,
  sm: 10,
  md: 15,
  lg: 20,
  xl: 30,
  screen: 12,
};

// Study screens share the same gutters and readable width as the quiz reader.
export const STUDY_LAYOUT = {
  paddingHorizontal: SPACING.screen,
  paddingBottom: 16,
  paddingTop: SPACING.md,
  width: '100%' as const,
  maxWidth: 840,
  alignSelf: 'center' as const,
};
