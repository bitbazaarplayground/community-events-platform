# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

<!-- INSTRUCTIONS FOR WEBSITE TO RUN !IMPORTANT -->

### Recommended VS Code Extensions

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — for class name autocompletion, error hints, and improved dev experience.

## 🧪 Testing

This project includes unit and integration tests using **Jest** and **React Testing Library**.

### What’s Covered

- ✅ Supabase data fetching and error handling (mocked responses)
- ✅ Ticketmaster API integration and merged event display
- ✅ Component rendering (Home page, EventCard)
- ✅ Authentication checks via mocked `supabase.auth.getUser`

### Running Tests

To run all tests in watch mode:

```bash
npm run test
```
