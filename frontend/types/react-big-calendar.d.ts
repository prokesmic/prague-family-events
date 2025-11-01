/**
 * Type declarations for react-big-calendar
 * This file ensures TypeScript can find the module types in all build environments
 */

declare module 'react-big-calendar' {
  export * from '@types/react-big-calendar';
}

declare module 'react-big-calendar/lib/css/react-big-calendar.css' {
  const content: any;
  export default content;
}
