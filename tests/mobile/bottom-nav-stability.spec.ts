import {test,expect} from '@playwright/test';

const tabs=['Calendar','Today','Patterns','More'];

test('primary tabs keep the bottom dock fixed and compact',async({page})=>{
  await page.setViewportSize({width:440,height:956});
  await page.goto('/Shiftly/?preview=demo&layout=installed&date=2026-10-21');
  const nav=page.locator('.mobile-nav');
  const baseline=await nav.boundingBox();
  expect(baseline).not.toBeNull();

  for(const name of tabs){
    await nav.getByRole('button',{name}).click();
    const box=await nav.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.y-baseline!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(box!.height-baseline!.height)).toBeLessThanOrEqual(1);
    expect(box!.height).toBeLessThanOrEqual(94);
    for(const button of await nav.locator('button').all()){
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
});
