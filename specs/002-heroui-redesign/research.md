# Research: HeroUI Integration for Survey App

## Decision: HeroUI (NextUI v2) with Tailwind CSS

### Rationale
HeroUI (formerly NextUI) provides a high-quality, accessible component library built on React Aria and Tailwind CSS. It aligns perfectly with the goal of creating a modern, "glassmorphism" aesthetic while maintaining strict accessibility standards required for educational tools.

### Best Practices for Vite + React
- **Tailwind Plugin**: HeroUI must be added as a Tailwind plugin to ensure proper styling of components.
- **Provider Pattern**: The `HeroUIProvider` must wrap the entire application in `main.jsx`.
- **Theme Detection**: Use the `dark` class on the `<html>` or `<body>` tag, or use the `theme` prop on `HeroUIProvider`.
- **Bundle Optimization**: Use HeroUI's individual component imports or ensure treeshaking is working correctly with Vite.

### Accessibility Strategy
- HeroUI is built on **React Aria**, which provides industry-standard accessibility primitives.
- We will use HeroUI's built-in focus management and ARIA attributes for all form components.
- Automated testing will be performed using `axe-core`.

### Theming Implementation
- **Light/Dark Mode**: HeroUI supports system-level detection out of the box. We will implement a toggle or rely on system settings as per the spec.
- **Glassmorphism**: This is a core feature of the HeroUI "Modern" theme. We will ensure the `layout` and `cards` use the default glassmorphism styles.

## Unknowns Resolved
- **Installation**: Requires `tailwindcss`, `postcss`, `autoprefixer`, `@heroui/react`, and `framer-motion`.
- **Configuration**: Requires updating `tailwind.config.js` to include HeroUI's content and plugin.
- **Customization**: Branding is handled via the `heroui` plugin configuration in `tailwind.config.js`.

## Alternatives Considered
- **Shadcn/UI**: Excellent accessibility, but requires more manual styling and setup for glassmorphism compared to HeroUI.
- **Mantine**: Very comprehensive, but has a larger runtime and is less aligned with the Tailwind-first approach requested.
- **Headless UI**: Provides maximum flexibility but would require building all components from scratch, increasing development time significantly.
