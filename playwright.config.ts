import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/mobile',
 timeout:30000,
 globalTimeout:5*60*1000,
 workers:1,
 retries:process.env.CI?1:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173/Shiftly/',hasTouch:true,isMobile:true,locale:'en-GB',timezoneId:'Europe/Malta',screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:['chromium','webkit'].flatMap(browserName=>[
  {name:browserName+'-iphone-portrait',use:{browserName:browserName as 'chromium'|'webkit',viewport:{width:440,height:956}}},
  {name:browserName+'-iphone-landscape',use:{browserName:browserName as 'chromium'|'webkit',viewport:{width:956,height:440}}}
 ]),
 webServer:{command:'pnpm start --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173/Shiftly/',reuseExistingServer:!process.env.CI}
});
