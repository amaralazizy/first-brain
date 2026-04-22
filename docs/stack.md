# Stack Registry

This document lists all major dependencies and their rationale.

## Web (Next.js)

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.1 | React framework with App Router |
| react | 19.2.4 | UI library |
| react-dom | 19.2.4 | React DOM renderer |
| typescript | ^5 | TypeScript support |

### API & Data Fetching
| Package | Version | Purpose |
|---------|---------|---------|
| @trpc/server | 11.16.0 | Type-safe API |
| @trpc/client | 11.16.0 | tRPC client |
| @trpc/react-query | 11.16.0 | React Query integration |
| @tanstack/react-query | 5.95.2 | Data fetching/caching |
| zod | 4.3.6 | Schema validation |

### Database
| Package | Version | Purpose |
|---------|---------|---------|
| drizzle-orm | 0.45.2 | Type-safe ORM |
| drizzle-kit | 0.31.10 | DB migrations |
| postgres | 3.4.8 | PostgreSQL driver |

### UI
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4 | Utility-first CSS |
| @tailwindcss/postcss | ^4 | PostCSS for Tailwind |
| shadcn | 4.1.1 | Component library |
| radix-ui | 1.4.3 | Headless UI primitives |
| class-variance-authority | 0.7.1 | Variant props |
| clsx | 2.1.1 | ClassName utility |
| tailwind-merge | 3.5.0 | Tailwind merge |
| @hugeicons/react | 1.1.6 | Icons |
| tw-animate-css | 1.4.0 | Animations |

### Dev Tools
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^9 | Linting |
| eslint-config-next | 16.2.1 | Next.js ESLint |
| husky | 9.1.7 | Git hooks |
| lint-staged | 16.4.0 | Staged linting |
| babel-plugin-react-compiler | 1.0.0 | React Compiler |

## Recommendation Engine (Python)

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| numpy | >=1.24.0 | Numerical computing |
| pandas | >=2.0.0 | Data analysis |
| scikit-learn | >=1.3.0 | ML algorithms |
| xgboost | >=2.0.0 | Gradient boosting |
| shap | >=0.42.0 | Model interpretability |
| pytest | >=7.0.0 | Testing |

## Tooling

### Package Manager
- **pnpm**: Fast, disk-efficient package manager with workspace support

### IDE
- VS Code with TypeScript and Python extensions recommended
