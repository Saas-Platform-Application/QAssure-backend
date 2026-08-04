// const express = require('express');
// const path = require('path');
// const fs = require('fs');

// const router = express.Router();

// // Auto-discover and load route files
// const routesDir = __dirname;
// const routeFiles = fs.readdirSync(routesDir)
//   .filter(file => {
//     // Match files like: user_routes.js, product_routes.js, etc.
//     // Exclude index.js itself
//     return file.endsWith('_routes.js') || file.endsWith('Routes.js');
//   })
//   .sort();

// let loadedRoutes = 0;
// let failedRoutes = 0;

// routeFiles.forEach(file => {
//   try {
//     const routeModule = require(path.join(routesDir, file));
//     const routeName = file.replace('_routes.js', '').replace('Routes.js', '');
    
//     // Determine route path from filename (e.g., user_routes.js -> /users)
//     const routePath = `/${routeName.replace('_', '-')}s`;
    
//     // Use the route module (should export a router)
//     if (routeModule && typeof routeModule === 'function') {
//       router.use(routePath, routeModule);
//       loadedRoutes++;
//       console.log(`✅ Registered routes: ${routePath} from ${file}`);
//     } else if (routeModule && routeModule.router) {
//       router.use(routePath, routeModule.router);
//       loadedRoutes++;
//       console.log(`✅ Registered routes: ${routePath} from ${file}`);
//     } else {
//       console.warn(`⚠️ Route file ${file} does not export a valid router`);
//       failedRoutes++;
//     }
//   } catch (error) {
//     console.error(`❌ Failed to load route file ${file}:`, error.message);
//     failedRoutes++;
//   }
// });

// // Also try to load routes from explicit entity list (if provided during generation)

// if (loadedRoutes === 0 && failedRoutes === 0) {
//   console.warn('⚠️ No route files found in routes directory');
// }

// console.log(`📊 Routes summary: ${loadedRoutes} loaded, ${failedRoutes} failed`);

// module.exports = router;
