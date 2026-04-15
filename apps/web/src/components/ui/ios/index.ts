/**
 * iOS Component Library — Barrel Export
 *
 * Import all iOS components from a single path:
 * import { IOSButton, IOSCard, IOSBadge } from '@/components/ui/ios';
 */

// Buttons
export { IOSButton } from './IOSButton';
export type { IOSButtonProps } from './IOSButton';

// Cards
export { IOSCard, IOSCardHeader, IOSCardContent, IOSCardFooter } from './IOSCard';
export type { IOSCardProps, IOSCardHeaderProps } from './IOSCard';

// Badges
export { IOSBadge } from './IOSBadge';
export type { IOSBadgeProps } from './IOSBadge';

// Switch
export { IOSSwitch } from './IOSSwitch';
export type { IOSSwitchProps } from './IOSSwitch';

// Search
export { IOSSearchBar } from './IOSSearchBar';
export type { IOSSearchBarProps } from './IOSSearchBar';

// List
export { IOSList, IOSListItem, IOSListSection } from './IOSList';
export type { IOSListProps, IOSListItemProps, IOSListSectionProps } from './IOSList';

// Navigation
export { IOSNavigationBar } from './IOSNavigationBar';
export type { IOSNavigationBarProps } from './IOSNavigationBar';

// Sheet
export { IOSSheet } from './IOSSheet';
export type { IOSSheetProps } from './IOSSheet';

// Toast
export { IOSToastContainer } from './IOSToast';

// Form Elements
export {
    IOSInput,
    IOSTextarea,
    IOSSelect,
    IOSCheckbox,
    IOSRadioGroup,
} from './IOSFormElements';
export type {
    IOSInputProps,
    IOSTextareaProps,
    IOSSelectProps,
    IOSCheckboxProps,
    IOSRadioGroupProps,
    IOSSelectOption,
    IOSRadioOption,
} from './IOSFormElements';
