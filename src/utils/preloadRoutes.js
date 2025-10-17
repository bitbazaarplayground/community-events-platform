// src/utils/preloadRoutes.js

// preloads pages that are lazy-loaded in App.jsx
export const preloadRoute = (pageName) => {
  switch (pageName) {
    case "Home":
      import("../pages/Home.jsx");
      break;
    case "Browse":
      import("../pages/Browse.jsx");
      break;
    case "Auth":
      import("../pages/Auth.jsx");
      break;
    case "UserDashboard":
      import("../pages/UserDashboard.jsx");
      break;
    case "PostEvent":
      import("../pages/PostEvent.jsx");
      break;
    case "MyEvents":
      import("../pages/MyEvents.jsx");
      break;
    case "Recovery":
      import("../pages/Recovery.jsx");
      break;
    default:
      break;
  }
};
