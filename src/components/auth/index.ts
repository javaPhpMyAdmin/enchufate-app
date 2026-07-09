/**
 * Auth components — public surface.
 *
 * Screens should import from this barrel so the internal folder layout
 * can evolve without breaking call sites.
 */
export { AuthHeader, type AuthHeaderProps } from './AuthHeader';
export { OnboardingDots, type OnboardingDotsProps } from './OnboardingDots';
export { OnboardingSlide, type OnboardingSlideProps } from './OnboardingSlide';
export {
  PasswordInput,
  type PasswordInputProps,
} from './PasswordInput';
export { SocialAuthButtons } from './SocialAuthButtons';
