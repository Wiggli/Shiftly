import {build} from 'vite';
await build({configFile:false,publicDir:false,build:{outDir:'supabase/functions/shiftly-api',emptyOutDir:true,target:'esnext',minify:false,ssr:'standalone/server/index.ts',rollupOptions:{external:['node:async_hooks'],output:{entryFileNames:'index.js',inlineDynamicImports:true}}},ssr:{noExternal:['zod']}});
