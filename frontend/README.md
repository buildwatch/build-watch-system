# Build Watch Frontend - Astro Application

This is the frontend application for Build Watch LGU Project Monitoring and Evaluation System, built with [Astro](https://astro.build/).

## Technology Stack

- **Astro**: Modern static site generator with server-side rendering
- **Tailwind CSS**: Utility-first CSS framework
- **React Components**: Interactive components where needed
- **JavaScript**: Client-side functionality and API integration

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.\
Open [http://localhost:4321](http://localhost:4321) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles Astro in production mode and optimizes the build for the best performance.

The build is minified and optimized for production deployment.\
Your app is ready to be deployed!

See the [Astro deployment guide](https://docs.astro.build/en/guides/deploy/) for more information.

### `npm run preview`

Previews the production build locally.\
This command will start a local server to preview your built site.

### Authentication Features

- **Session Management**: Cross-browser session protection
- **Role-Based Redirects**: Automatic redirection to appropriate dashboards
- **Home Page Redirect**: Invalid sessions redirect to home page for all user types
- **Token Validation**: Automatic token verification and refresh

## Learn More

You can learn more in the [Astro documentation](https://docs.astro.build/en/getting-started/).

To learn about the project structure and components, check out the main [README.md](../README.md).

### Project Structure

```
frontend/
├── src/
│   ├── pages/                 # Astro pages and routes
│   │   ├── dashboard/         # Role-specific dashboards
│   │   └── login/            # Authentication pages
│   ├── components/           # Reusable UI components
│   ├── services/            # API integration services
│   ├── layouts/             # Page layouts
│   └── styles/              # Global styles
├── public/                  # Static assets
└── astro.config.mjs        # Astro configuration
```

### Authentication Flow

1. **Login**: Users authenticate through `/login/lgu-pmt`
2. **Session Validation**: Automatic token verification on page load
3. **Role-Based Access**: Users redirected to appropriate dashboards
4. **Session Protection**: Invalid sessions redirect to home page
5. **Cross-Browser Security**: Session management prevents unauthorized access
